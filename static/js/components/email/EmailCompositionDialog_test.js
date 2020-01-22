import React from "react"
import _ from "lodash"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import ReactTestUtils from "react-dom/test-utils"

import { SEARCH_RESULT_EMAIL_CONFIG } from "./lib"
import * as inputUtil from "../inputs/util"
import { FETCH_PROCESSING } from "../../actions"
import { modifyTextField } from "../../util/test_utils"
import EmailCompositionDialog from "./EmailCompositionDialog"
import {
  TEST_EMAIL_TYPE,
  TEST_EMAIL_CONFIG,
  INITIAL_TEST_EMAIL_STATE
} from "./test_constants"
import {
  AUTOMATIC_EMAIL_ADMIN_TYPE,
  LEARNER_EMAIL_TYPE,
  COURSE_EMAIL_TYPE,
  SEARCH_EMAIL_TYPE
} from "./constants"

describe("EmailCompositionDialog", () => {
  let sandbox, sendStub, closeStub, updateStub

  const updateObject = (objectToUpdate = {}, updatedProps = {}) => {
    const cloned = _.cloneDeep(objectToUpdate)
    _.forEach(updatedProps, function(value, key) {
      cloned[key] = value
    })
    return cloned
  }

  const getDialog = () => document.querySelector(".email-composition-dialog")

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sendStub = sandbox.stub()
    sendStub.returns(Promise.resolve())
    closeStub = sandbox.stub()
    updateStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (updatedEmailState = {}, props = {}) => {
    const emailState = updateObject(
      INITIAL_TEST_EMAIL_STATE[TEST_EMAIL_TYPE],
      updatedEmailState
    )
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <EmailCompositionDialog
          updateEmailFieldEdit={() => updateStub}
          updateEmailBody={updateStub}
          closeAndClearEmailComposer={closeStub}
          closeEmailComposerAndSend={sendStub}
          dialogVisibility={true}
          dialogType={TEST_EMAIL_TYPE}
          activeEmail={emailState}
          title={TEST_EMAIL_CONFIG.title}
          subheadingRenderer={TEST_EMAIL_CONFIG.renderSubheading}
          {...props}
        />
      </MuiThemeProvider>
    )
  }

  it("should have a title", () => {
    renderDialog()
    assert.equal(
      document.querySelector(".dialog-title").textContent,
      "Test Email Dialog"
    )
  })

  it("renders a radio button for setting whether an email is automatic or not", () => {
    renderDialog({
      supportsAutomaticEmails: true,
      inputs:                  {
        sendAutomaticEmails: false
      }
    })
    const radioGroupDiv = document.querySelector(".type-radio-group")
    assert.equal(radioGroupDiv.childElementCount, 2)
    assert.include(
      document.querySelector(".type-radio-group").textContent,
      "Send a one-time email"
    )
    assert.include(
      document.querySelector(".type-radio-group").textContent,
      "Create an Email Campaign"
    )
  })

  it('should fire the send handler when the "send" button is clicked', () => {
    renderDialog({ inputs: { subject: "abc", body: "abc" } })
    ReactTestUtils.Simulate.click(getDialog().querySelector(".save-button"))
    assert.isTrue(sendStub.called, "called send handler")
  })

  it('should show a "Save" label when the dialog is being used to edit an email', () => {
    renderDialog(
      { inputs: { subject: "abc", body: "abc" } },
      { dialogType: AUTOMATIC_EMAIL_ADMIN_TYPE }
    )
    assert.equal(
      getDialog().querySelector(".save-button").textContent,
      "Save Changes"
    )
  })

  for (const dialogType of [
    LEARNER_EMAIL_TYPE,
    COURSE_EMAIL_TYPE,
    SEARCH_EMAIL_TYPE
  ]) {
    it('should show a "Send" label when the dialog is being used to send an email', () => {
      renderDialog(
        { inputs: { subject: "abc", body: "abc" } },
        { dialogType: dialogType }
      )
      assert.equal(
        getDialog().querySelector(".save-button").textContent,
        "Send"
      )
    })
  }

  it('should fire the close handler when the "cancel" button is clicked', () => {
    renderDialog()
    ReactTestUtils.Simulate.click(getDialog().querySelector(".cancel-button"))
    assert.isTrue(closeStub.called, "called send handler")
  })

  it("should show a disabled spinner button if email send is in progress", () => {
    const dialogActionsSpy = sandbox.spy(inputUtil, "dialogActions")
    renderDialog({ fetchStatus: FETCH_PROCESSING })

    // assert that inFlight is true
    assert.isTrue(
      dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, true)
    )
    assert.equal(dialogActionsSpy.callCount, 1)
  })

  it("should not show a subheader when subheader text does not exist in the state", () => {
    renderDialog()
    assert.isNull(document.querySelector(".test-subheading"))
  })

  it("should show a subheading when subheading text exists in the state", () => {
    renderDialog({ subheading: "this is a subheading" })
    const subheading = document.querySelector(".test-subheading")
    assert.equal(subheading.tagName, "DIV")
    assert.equal(subheading.textContent, "this is a subheading")
  })

  it("should show a default title when one is not passed in", () => {
    renderDialog({}, { title: undefined })
    assert.equal(
      document.querySelector(".dialog-title").textContent,
      "New Email"
    )
  })

  describe("editing subject", () => {
    const getField = () => document.querySelector(".email-subject")

    it("should show placeholder text if the store value is empty", () => {
      renderDialog()
      assert.notEqual(getField().placeholder, "")
    })

    it("should display the value from the store", () => {
      renderDialog({ inputs: { subject: "subject value" } })
      assert.equal(getField().value, "subject value")
    })

    it("should fire the updateEmailEdit callback on change", () => {
      renderDialog()
      const fieldInput = getField()
      modifyTextField(fieldInput, "HI")
      assert.isTrue(updateStub.called, "called update handler")
    })

    it("should show an error if an error for the field is passed in", () => {
      const errorMessage = "error!"
      renderDialog({ validationErrors: { subject: errorMessage } })
      const message = getDialog().querySelector(".validation-error").textContent
      assert.equal(message, errorMessage)
    })
  })

  describe("editing email body", () => {
    const getEditorContents = () =>
      document.querySelector(".public-DraftEditor-content")

    it("should be empty at first", () => {
      renderDialog()
      assert.equal(getEditorContents().textContent, "")
    })

    it("should display the value in the store", () => {
      renderDialog({ inputs: { body: "HEY THERE" } })
      assert.equal(getEditorContents().textContent, "HEY THERE")
    })

    it("should display passed-in HTML", () => {
      renderDialog({
        inputs: {
          body: "<h1>TITLE IS BIG</h1>"
        }
      })
      assert.equal(
        getEditorContents().querySelector("h1").textContent,
        "TITLE IS BIG"
      )
    })

    it("shouldnt mangle links in the passed-in HTML", () => {
      renderDialog({
        inputs: {
          body: '<a href="https://en.wikipedia.org/wiki/Potato">A Link!</a>'
        }
      })
      const link = getEditorContents().querySelector("a")
      assert.equal(link.textContent, "A Link!")
      assert.equal(link.href, "https://en.wikipedia.org/wiki/Potato")
    })

    it("should insert recipient variables", () => {
      renderDialog({}, { supportBulkEmails: true })
      ReactTestUtils.Simulate.click(getDialog().querySelector(".button-Email"))
      assert.include(getEditorContents().textContent, "[Email]")
    })

    for (const dialogType of [
      [LEARNER_EMAIL_TYPE, false],
      [COURSE_EMAIL_TYPE, false],
      [SEARCH_EMAIL_TYPE, true],
      [AUTOMATIC_EMAIL_ADMIN_TYPE, true]
    ]) {
      it(`should ${!dialogType[1] ? "display" : "not display"} 
        recipient variables for ${dialogType[0]}`, () => {
        renderDialog({}, { supportBulkEmails: dialogType[1] })
        assert.equal(
          _.isNull(getDialog().querySelector(".toolbar-below")),
          !dialogType[1]
        )
      })
    }
  })

  it("should render recipients", () => {
    renderDialog(
      {
        filters: [
          {
            id:    "1",
            name:  "program.course_runs.semester",
            value: "2015"
          },
          {
            id:    "2",
            name:  "ES",
            value: "foo"
          },
          {
            id:    "3",
            name:  "profile.birth_country",
            value: "ES"
          }
        ]
      },
      { renderRecipients: SEARCH_RESULT_EMAIL_CONFIG.renderRecipients }
    )

    assert.include(
      getDialog().querySelector(".sk-selected-filters").textContent,
      "Semester: 2015"
    )
    assert.include(
      getDialog().querySelector(".sk-selected-filters").textContent,
      "Spain: foo"
    )
    assert.include(
      getDialog().querySelector(".sk-selected-filters").textContent,
      "Country of Birth: Spain"
    )
  })
})

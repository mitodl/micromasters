import React from "react"
import R from "ramda"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import ReactTestUtils from "react-dom/test-utils"

import * as inputUtil from "../inputs/util"
import ChannelCreateDialog from "./ChannelCreateDialog"
import { INITIAL_CHANNEL_STATE } from "../../reducers/channel_dialog"

describe("ChannelCreateDialog", () => {
  let sandbox, closeAndClearStub, closeAndCreateStub, updateFieldEditStub

  const getDialog = () => document.querySelector(".create-channel-dialog")

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    closeAndClearStub = sandbox.stub()
    closeAndCreateStub = sandbox.stub()
    updateFieldEditStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (extraState = {}, props = {}) => {
    const dialogState = R.mergeDeepRight(INITIAL_CHANNEL_STATE, extraState)
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <ChannelCreateDialog
          closeAndClearDialog={closeAndClearStub}
          closeAndCreateDialog={closeAndCreateStub}
          updateFieldEdit={updateFieldEditStub}
          channelDialog={dialogState}
          isSavingChannel={false}
          dialogVisibility={true}
          currentProgramEnrollment={{
            title: "Test Program"
          }}
          {...props}
        />
      </MuiThemeProvider>
    )
  }

  it('should fire the send handler when the "send" button is clicked', () => {
    renderDialog()
    ReactTestUtils.Simulate.click(getDialog().querySelector(".save-button"))
    assert.isTrue(closeAndCreateStub.called, "called send handler")
  })

  it('should fire the close handler when the "cancel" button is clicked', () => {
    renderDialog()
    ReactTestUtils.Simulate.click(getDialog().querySelector(".cancel-button"))
    assert.isTrue(closeAndClearStub.called, "called send handler")
  })

  it("should show a disabled spinner button if channelCreate is in progress", () => {
    const dialogActionsSpy = sandbox.spy(inputUtil, "dialogActions")
    renderDialog({}, { isSavingChannel: true })

    // assert that inFlight is true
    assert.isTrue(
      dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, true)
    )
    assert.equal(dialogActionsSpy.callCount, 1)
  })

  for (const field of ["title", "name"]) {
    it(`should trigger updates on the ${field} field`, () => {
      renderDialog()
      const input = getDialog().querySelector(`input[name=${field}]`)
      ReactTestUtils.Simulate.change(input)
      assert.isTrue(updateFieldEditStub.called, "called send handler")
    })
  }
  it(`should trigger updates on the description field`, () => {
    renderDialog()
    const input = getDialog().querySelector(`textarea[name=description]`)
    ReactTestUtils.Simulate.change(input)
    assert.isTrue(updateFieldEditStub.called, "called send handler")
  })

  for (const field of ["title", "name", "description"]) {
    it(`should show validation error on the ${field} field`, () => {
      renderDialog({
        validationErrors: {
          [field]: `${field} error message`
        },
        validationVisibility: {
          [field]: true
        }
      })
      assert.equal(
        getDialog().querySelector(".validation-error").textContent,
        `${field} error message`
      )
    })
  }

  it("should show a validation error for a 403", () => {
    renderDialog({
      validationErrors: {
        detail: "You do not have permission to perform this action."
      }
    })
    assert.equal(
      getDialog().querySelector(".validation-error").textContent,
      "You do not have permission to perform this action."
    )
  })

  it("should show all users in program if no filters", () => {
    renderDialog()
    assert.equal(
      getDialog().querySelector(".sk-selected-filters-list").textContent,
      "All users in Test Program"
    )
  })

  it("should show selected filters", () => {
    renderDialog({
      filters: [
        {
          id:    "course",
          name:  "program.courses.course_title",
          value: "Test Course 100"
        }
      ]
    })
    assert.equal(
      getDialog().querySelector(".sk-selected-filters-list").textContent,
      "Course: Test Course 100"
    )
  })

  it("should render company name same as state abbr. correct", () => {
    renderDialog({
      filters: [
        {
          id:    "company_name",
          name:  "profile.work_history.company_name",
          value: "US-ME"
        }
      ]
    })
    assert.equal(
      getDialog().querySelector(".sk-selected-filters-list").textContent,
      "Company: US-ME"
    )
  })
})

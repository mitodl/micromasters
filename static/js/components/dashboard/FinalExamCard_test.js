// @flow
/* global SETTINGS: false */
import _ from "lodash"
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import IconButton from "@material-ui/core/IconButton"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import ReactTestUtils from "react-dom/test-utils"

import FinalExamCard from "./FinalExamCard"
import { DASHBOARD_RESPONSE, USER_PROFILE_RESPONSE } from "../../test_constants"
import {
  PEARSON_PROFILE_ABSENT,
  PEARSON_PROFILE_SUCCESS,
  PEARSON_PROFILE_IN_PROGRESS,
  PEARSON_PROFILE_INVALID,
  PEARSON_PROFILE_SCHEDULABLE
} from "../../constants"
import { INITIAL_PEARSON_STATE } from "../../reducers/pearson"
import { INITIAL_UI_STATE } from "../../reducers/ui"
import { stringStrip, getEl } from "../../util/test_utils"
import type { Program } from "../../flow/programTypes"

describe("FinalExamCard", () => {
  let sandbox
  let navigateToProfileStub, submitPearsonSSOStub, showPearsonTOSDialogStub
  let props

  const profile = { ...USER_PROFILE_RESPONSE, preferred_name: "Preferred Name" }

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    navigateToProfileStub = sandbox.stub()
    submitPearsonSSOStub = sandbox.stub()
    showPearsonTOSDialogStub = sandbox.stub()
    SETTINGS.FEATURES.ENABLE_EDX_EXAMS = false
    const program: Program = (_.cloneDeep(
      DASHBOARD_RESPONSE.programs.find(
        program => program.pearson_exam_status !== undefined
      )
    ): any)
    props = {
      profile:              profile,
      program:              program,
      navigateToProfile:    navigateToProfileStub,
      submitPearsonSSO:     submitPearsonSSOStub,
      pearson:              { ...INITIAL_PEARSON_STATE },
      ui:                   { ...INITIAL_UI_STATE },
      showPearsonTOSDialog: showPearsonTOSDialogStub
    }
  })

  const commonText = `You must take a proctored exam for each course. Exams may
be taken at any authorized Pearson test center. Before you can take an exam, you have to
pay for the course and pass the online work.`

  const getDialog = () => document.querySelector(".dialog-to-pearson-site")
  const renderCard = props =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <FinalExamCard {...props} />
      </MuiThemeProvider>
    )

  it("should not render when pearson_exam_status is empty", () => {
    const card = renderCard(props)
    assert.equal(card.html(), "")
  })

  it("should just show a basic message if the profile is absent", () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_ABSENT
    const card = renderCard(props)
    assert.include(stringStrip(card.text()), stringStrip(commonText))
    assert.notInclude(
      stringStrip(card.text()),
      "Your Pearson Testing account has been created"
    )
  })
  ;[PEARSON_PROFILE_SUCCESS, PEARSON_PROFILE_SCHEDULABLE].forEach(status => {
    it(`should let the user know when the profile is ready when the status is ${status}`, () => {
      props.program.pearson_exam_status = status
      const cardText = stringStrip(renderCard(props).text())
      assert.include(cardText, "Your Pearson Testing account has been created")
    })

    it(`should include profile info if the profile is ${status}`, () => {
      props.program.pearson_exam_status = status
      const cardText = stringStrip(renderCard(props).text())
      assert.include(cardText, profile.address)
      assert.include(cardText, profile.romanized_first_name)
      assert.include(cardText, profile.romanized_last_name)
      assert.notInclude(cardText, profile.preferred_name)
      assert.include(cardText, stringStrip(profile.phone_number))
      assert.include(cardText, profile.state_or_territory)
    })

    it(`should show a button to edit if the profile is ${status}`, () => {
      props.program.pearson_exam_status = status
      const card = renderCard(props)
      card.find(IconButton).simulate("click")
      assert(navigateToProfileStub.called)
    })
  })

  it("should let the user know if the profile is in progress", () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_IN_PROGRESS
    const card = renderCard(props)
    assert.include(
      stringStrip(card.text()),
      "Your updated information has been submitted to Pearson Please check back later"
    )
  })

  it("should let the user know if the profile is invalid", () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_INVALID
    const card = renderCard(props)
    assert.include(
      stringStrip(card.text()),
      "You need to update your profile in order to take a test at a Pearson Test center"
    )
  })

  it("should show a schedule button when an exam is schedulable", () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE
    const card = renderCard(props)
    const button = card.find(".exam-button")
    assert.equal(button.text(), "Schedule an exam")
    button.simulate("click")
    assert(showPearsonTOSDialogStub.called)
  })

  it("should show the titles of schedulable exams", () => {
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE
    const course = props.program.courses[0]
    course.can_schedule_exam = true
    const card = renderCard(props)
    assert.include(
      stringStrip(card.text()),
      `You are ready to schedule an exam for ${stringStrip(course.title)}`
    )
  })

  it("should show a scheduling error, when there is one", () => {
    props.pearson.error = "ERROR ERROR"
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE
    const card = renderCard(props)
    assert.include(stringStrip(card.text()), "ERROR ERROR")
  })

  it("renders confirm pearson TOS dialog", () => {
    props.ui.dialogVisibility = { pearsonTOSDialogVisible: true }
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE
    renderCard(props)
    assert.include(
      getEl(document, ".dialog-title").textContent,
      "You are being redirected to Pearson VUE’s website."
    )
    assert.include(
      getEl(document, ".tos-container").textContent,
      "You acknowledge that by clicking Continue, you will be leaving the MITx MicroMasters " +
        "website and going to a third-party website over which MIT’s MITx does not have control, "
    )
    assert.include(
      getEl(document, ".tos-container").textContent,
      " from any and all claims, demands, suits, judgments, damages, actions and liabilities " +
        "of every kind and nature whatsoever, that you may suffer at any time as a result of the Purpose."
    )
    assert.include(
      getEl(document, ".attention").textContent,
      "By clicking Continue, I agree to above Terms and Conditions."
    )
  })

  it("showToPearsonSiteDialog called in cancel", () => {
    props.ui.dialogVisibility = { pearsonTOSDialogVisible: true }
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE
    renderCard(props)
    ReactTestUtils.Simulate.click(getEl(getDialog(), ".cancel-button"))
    assert.equal(showPearsonTOSDialogStub.callCount, 1)
  })

  it("submitPearsonSSO called in continue", () => {
    props.ui.dialogVisibility = { pearsonTOSDialogVisible: true }
    props.program.pearson_exam_status = PEARSON_PROFILE_SCHEDULABLE
    renderCard(props)
    const btnContinue = getEl(getDialog(), ".save-button")
    assert.equal(btnContinue.textContent, "CONTINUE")
    ReactTestUtils.Simulate.click(btnContinue)
    assert.equal(submitPearsonSSOStub.callCount, 1)
  })
})

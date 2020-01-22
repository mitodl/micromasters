// @flow
import React from "react"
import { assert } from "chai"
import _ from "lodash"
import { shallow } from "enzyme"
import MenuItem from "@material-ui/core/MenuItem"
import Select from "@material-ui/core/Select"

import { FETCH_PROCESSING } from "../actions"
import { DASHBOARD_SUCCESS_ACTIONS } from "../containers/test_util"
import * as enrollmentActions from "../actions/programs"
import * as uiActions from "../actions/ui"
import { DASHBOARD_RESPONSE, PROGRAMS } from "../test_constants"
import ProgramEnrollmentDialog from "./ProgramEnrollmentDialog"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("ProgramEnrollmentDialog", () => {
  let helper
  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderEnrollmentDialog = (props = {}) => {
    return shallow(
      <ProgramEnrollmentDialog
        programs={PROGRAMS}
        visibility={true}
        {...props}
      />
    )
  }

  it("renders a dialog", () => {
    return helper
      .renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS)
      .then(([wrapper]) => {
        const dialog = wrapper.find(ProgramEnrollmentDialog).at(0)
        const props = dialog.props()

        assert.deepEqual(props.programs, PROGRAMS)
      })
  })

  for (const [uiAction, funcName, propName, value] of [
    ["setEnrollProgramDialogError", "setError", "error", "error"],
    ["setEnrollProgramDialogVisibility", "setVisibility", "visibility", true],
    ["setEnrollSelectedProgram", "setSelectedProgram", "selectedProgram", 3]
  ]) {
    it(`dispatches ${funcName}`, () => {
      const stub = helper.sandbox.spy(uiActions, uiAction)
      return helper
        .renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS)
        .then(([wrapper]) => {
          const handler = wrapper
            .find(ProgramEnrollmentDialog)
            .at(0)
            .props()[funcName]
          handler(value)
          assert(stub.calledWith(value))
        })
    })

    it(`the prop ${propName} comes from the state`, () => {
      helper.store.dispatch(uiActions[uiAction](value))

      return helper
        .renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS)
        .then(([wrapper]) => {
          const actual = wrapper
            .find(ProgramEnrollmentDialog)
            .at(0)
            .props()[propName]
          assert.equal(actual, value)
        })
    })
  }

  it("dispatches addProgramEnrollment", () => {
    const stub = helper.sandbox.stub(enrollmentActions, "addProgramEnrollment")
    stub.returns({ type: "fake" })
    return helper
      .renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS)
      .then(([wrapper]) => {
        const handler = wrapper
          .find(ProgramEnrollmentDialog)
          .at(0)
          .props().enrollInProgram
        handler(3)
        assert(stub.calledWith(3))
      })
  })

  it("can select the program enrollment via SelectField", () => {
    const enrollment = PROGRAMS[0]
    const stub = helper.sandbox.stub()
    const wrapper = renderEnrollmentDialog({
      setSelectedProgram: stub
    })
    wrapper
      .find(Select)
      .props()
      .onChange({ target: { value: enrollment } })
    assert(stub.calledWith(enrollment))
  })

  it("can dispatch an addProgramEnrollment action for the currently selected enrollment", () => {
    const selectedEnrollment = PROGRAMS[0]
    const enrollStub = helper.sandbox.stub()
    const wrapper = renderEnrollmentDialog({
      enrollInProgram: enrollStub,
      selectedProgram: selectedEnrollment
    })
    const button = wrapper.find(".enroll-button")
    button.props().onClick()
    assert(enrollStub.calledWith(selectedEnrollment))
  })

  for (const activity of [true, false]) {
    it(`spins the save button spinner depending on activity=${activity.toString()}`, () => {
      const wrapper = renderEnrollmentDialog({
        fetchAddStatus: activity ? FETCH_PROCESSING : undefined
      })
      const button = wrapper.find(".enroll-button")
      assert.equal(button.name(), "SpinnerButton")
      assert.equal(button.props().spinning, activity)
    })
  }

  it("shows an error if the user didn't select any program when they click enroll", () => {
    const stub = helper.sandbox.stub()
    const wrapper = renderEnrollmentDialog({
      setError: stub
    })
    const button = wrapper.find(".enroll-button")
    button.props().onClick()
    assert(stub.calledWith("No program selected"))
  })

  it("clears the dialog when the user clicks cancel", () => {
    const stub = helper.sandbox.stub()
    const wrapper = renderEnrollmentDialog({
      setVisibility: stub
    })
    const button = wrapper.find(".cancel-button")
    button.props().onClick()
    assert(stub.calledWith(false))
  })

  it("only shows programs which the user is not already enrolled in", () => {
    const enrollmentLookup = new Map(
      PROGRAMS.map(enrollment => [enrollment.id, null])
    )
    let unenrolledPrograms = DASHBOARD_RESPONSE.programs.filter(
      program => !enrollmentLookup.has(program.id)
    )
    unenrolledPrograms = _.sortBy(unenrolledPrograms, "title")
    unenrolledPrograms = unenrolledPrograms.map(program => ({
      title: program.title,
      id:    program.id
    }))

    const selectedEnrollment = PROGRAMS[0]

    const wrapper = renderEnrollmentDialog({
      visibility:      false,
      selectedProgram: selectedEnrollment
    })

    const list = wrapper.find(MenuItem).map(menuItem => {
      const props = menuItem.props()
      return {
        title: props.primaryText,
        id:    props.value
      }
    })

    assert.deepEqual(list, unenrolledPrograms)
  })

  it("shows the current enrollment in the Select", () => {
    const selectedEnrollment = PROGRAMS[0]

    const wrapper = renderEnrollmentDialog({
      selectedProgram: selectedEnrollment,
      visibility:      false
    })
    const select = wrapper.find(Select)
    assert.equal(select.props().value, selectedEnrollment)
  })
})

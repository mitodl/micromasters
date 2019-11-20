/* global SETTINGS: false */
import PropTypes from "prop-types"
import { assert } from "chai"
import { mount } from "enzyme"
import sinon from "sinon"
import React from "react"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import LeaveProgramWizard from "./LeaveProgramWizard"
import { USER_PROFILE_RESPONSE, PROGRAMS } from "../test_constants"
import { UNENROLL_PROGRAM_DIALOG } from "../actions/programs"

describe("LeaveProgramWizard", () => {
  let sandbox
  const props = {
    profile:  USER_PROFILE_RESPONSE,
    programs: PROGRAMS,
    ui:       {
      programsToUnEnroll:         [],
      programsToUnEnrollInFlight: false,
      dialogVisibility:           {
        unenrollProgramDialog: false
      }
    }
  }

  const getEl = (selector: string): HTMLElement => {
    return (document.querySelector(selector): HTMLElement)
  }

  const renderLeaveProgramWizard = () =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <LeaveProgramWizard {...props} />
      </MuiThemeProvider>,
      {
        context:           { router: { push: sandbox.stub() } },
        childContextTypes: {
          router: PropTypes.object.isRequired
        }
      }
    )

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    props["dispatch"] = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("assert other settings text", () => {
    const wrapper = renderLeaveProgramWizard()
    assert.equal(wrapper.find(".heading").text(), "Other Settings")
    assert.equal(
      wrapper.find(".unenroll-wizard-button").text(),
      "Leave a MicroMasters Program"
    )
  })

  it("assert dialog text", () => {
    props["ui"]["dialogVisibility"][UNENROLL_PROGRAM_DIALOG] = true
    renderLeaveProgramWizard(props)
    assert.include(
      getEl(".unenroll-settings").textContent,
      "When you leave a MicroMasters program, you will no longer be able " +
        "to participate in discussions or receive any email about that program."
    )
    assert.equal(
      getEl(".remind").textContent,
      "Which program do you want to leave?"
    )
    assert.equal(
      getEl(".dialog-title").textContent,
      "Leave a MicroMasters Program(s)"
    )
  })
})

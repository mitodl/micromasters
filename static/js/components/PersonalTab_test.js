import React from "react"
import PropTypes from "prop-types"
import { Provider } from "react-redux"
import { mount } from "enzyme"
import { assert } from "chai"
import R from "ramda"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import PersonalTab from "./PersonalTab"
import { PROGRAMS, USER_PROFILE_RESPONSE } from "../test_constants"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("PersonalTab", () => {
  let helper
  const renderPersonalTab = (selectedProgram = null, props = {}) => {
    const { store } = helper
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <Provider store={store}>
          <PersonalTab
            programs={PROGRAMS}
            ui={{ selectedProgram: selectedProgram }}
            dispatch={store.dispatch}
            uneditedProfile={USER_PROFILE_RESPONSE}
            profile={USER_PROFILE_RESPONSE}
            {...props}
          />
        </Provider>
      </MuiThemeProvider>,
      {
        context:           { router: {} },
        childContextTypes: { router: PropTypes.object }
      }
    )
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should show a list of programs to enroll in for the learner page", () => {
    const wrapper = renderPersonalTab()
    const programOptions = wrapper
      .find(".program-select")
      .find("Select")
      .props().options
    assert.equal(programOptions.length, PROGRAMS.length)
    const sortedEnrollments = R.sortBy(
      R.compose(
        R.toLower,
        R.prop("title")
      )
    )(PROGRAMS)
    programOptions.forEach((menuItem, i) => {
      const program = sortedEnrollments[i]
      assert.equal(program.title, menuItem.label)
      assert.equal(program.id, menuItem.value)
    })
  })

  it("should have the current program enrollment selected", () => {
    const selectedProgram = PROGRAMS[0]
    const wrapper = renderPersonalTab(selectedProgram)
    const props = wrapper
      .find(".program-select")
      .find("Select")
      .props()
    assert.equal(props.value, selectedProgram.id)
  })
})

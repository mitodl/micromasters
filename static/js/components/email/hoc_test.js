import React from "react"
import R from "ramda"
import { mount } from "enzyme"
import { assert } from "chai"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import IntegrationTestHelper from "../../util/integration_test_helper"
import { withEmailDialog } from "./hoc"
import { EMAIL_COMPOSITION_DIALOG } from "./constants"
import { START_EMAIL_EDIT } from "../../actions/email"
import { SHOW_DIALOG } from "../../actions/ui"
import {
  TEST_EMAIL_TYPE,
  TEST_EMAIL_CONFIG,
  INITIAL_TEST_EMAIL_STATE
} from "./test_constants"

describe("Email higher-order component", () => {
  let helper, listenForActions, openEmailSpy

  class TestContainerPage extends React.Component {
    render() {
      const { openEmailComposer } = this.props

      return (
        <div>
          <button onClick={openEmailComposer(TEST_EMAIL_TYPE)}>
            Open Email
          </button>
        </div>
      )
    }
  }

  const WrappedTestContainerPage = R.compose(
    withEmailDialog({
      [TEST_EMAIL_TYPE]: TEST_EMAIL_CONFIG
    })
  )(TestContainerPage)

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listenForActions = helper.listenForActions.bind(helper)
    openEmailSpy = helper.sandbox.spy(TEST_EMAIL_CONFIG, "emailOpenParams")
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderTestComponentWithDialog = () =>
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <WrappedTestContainerPage
          dispatch={helper.store.dispatch}
          ui={{ dialogVisibility: { [EMAIL_COMPOSITION_DIALOG]: false } }}
          email={INITIAL_TEST_EMAIL_STATE}
        />
      </MuiThemeProvider>
    )

  it("should render an email dialog when the wrapped component renders", () => {
    const wrapper = renderTestComponentWithDialog()
    assert.isOk(wrapper.find("EmailCompositionDialog"))
  })

  it("should expose a function that lets the wrapped component launch the email dialog", () => {
    const wrapper = renderTestComponentWithDialog()
    assert.isFalse(openEmailSpy.called)
    return listenForActions([START_EMAIL_EDIT, SHOW_DIALOG], () => {
      wrapper.find("button").simulate("click")
    }).then(() => {
      assert.isTrue(openEmailSpy.called)
      assert.equal(
        wrapper.find("EmailCompositionDialog").props().title,
        "Test Email Dialog"
      )
    })
  })

  it("should gracefully handle a currentlyActive email config that isn't present", () => {
    const wrapper = mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <WrappedTestContainerPage
          dispatch={helper.store.dispatch}
          ui={{ dialogVisibility: { [EMAIL_COMPOSITION_DIALOG]: false } }}
          email={{ ...INITIAL_TEST_EMAIL_STATE, currentlyActive: "missing" }}
        />
      </MuiThemeProvider>
    )
    // No error should happen and there should be no text here
    assert.equal(
      wrapper.find("EmailCompositionDialog").props().title,
      undefined
    )
  })
})

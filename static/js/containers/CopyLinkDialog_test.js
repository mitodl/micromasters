// @flow
import { mount } from "enzyme"
import { assert } from "chai"
import React from "react"
import { Provider } from "react-redux"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"

import { setShareDialogVisibility } from "../actions/share_grades_dialog"
import CopyLinkDialog from "./CopyLinkDialog"
import IntegratedTestHelper from "../util/integration_test_helper"
import { getEl } from "../util/test_utils"

describe("CopyLinkDialog", () => {
  let helper

  beforeEach(() => {
    helper = new IntegratedTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderDialog = (props = {}) => {
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <Provider store={helper.store}>
          <CopyLinkDialog {...props} />
        </Provider>
      </MuiThemeProvider>
    )
  }

  it("has the grades url in the input box", () => {
    window.location = `http://fake/hg6j3ni7`
    window.document.queryCommandSupported = () => true
    helper.store.dispatch(setShareDialogVisibility(true))
    renderDialog()

    const input = getEl(document.body, ".share-dialog input")
    assert.equal(input.getAttribute("value"), window.location)
  })
})

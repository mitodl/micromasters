// @flow
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider"
import getMuiTheme from "material-ui/styles/getMuiTheme"
import ReactTestUtils from "react-dom/test-utils"

import SkipFinancialAidDialog from "./SkipFinancialAidDialog"

describe("SkipFinancialAidDialog", () => {
  let sandbox
  let cancelStub, skipStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    cancelStub = sandbox.stub()
    skipStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  let renderDialog = (open = true): HTMLElement => {
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <SkipFinancialAidDialog
          open={open}
          cancel={cancelStub}
          skip={skipStub}
          fullPrice={<span>'$3000'</span>}
        />
      </MuiThemeProvider>
    )
    return (document.querySelector(".skip-financial-aid-dialog"): any)
  }

  it("should have some text and a title, including the full price amount", () => {
    let dialogText = renderDialog().textContent
    assert.include(dialogText, "Are you sure?")
    assert.include(dialogText, "$3000")
  })

  it("should have a confirm button", () => {
    ReactTestUtils.Simulate.click(renderDialog().querySelector(".save-button"))
    assert.ok(skipStub.called, "skip function should have been called")
  })

  it("should have a cancel button", () => {
    ReactTestUtils.Simulate.click(
      renderDialog().querySelector(".cancel-button")
    )
    assert.ok(cancelStub.called, "cancel function should have been called")
  })
})

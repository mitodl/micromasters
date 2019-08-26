// @flow
import React from "react"
import PropTypes from "prop-types"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import ReactTestUtils from "react-dom/test-utils"

import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import PersonalCoursePriceDialog from "./PersonalCoursePriceDialog"
import { getEl } from "../../util/test_utils"

describe("CourseEnrollmentDialog", () => {
  let sandbox, setVisibilityStub, openFinancialAidCalculatorStub, routerPushStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    setVisibilityStub = sandbox.spy()
    openFinancialAidCalculatorStub = sandbox.spy()
    routerPushStub = sandbox.spy()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (open = true) => {
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <PersonalCoursePriceDialog
          open={open}
          setVisibility={setVisibilityStub}
          openFinancialAidCalculator={openFinancialAidCalculatorStub}
        />
      </MuiThemeProvider>,
      {
        context: {
          router: { push: routerPushStub }
        },
        childContextTypes: {
          router: PropTypes.object.isRequired
        }
      }
    )
    const el: HTMLElement = (document.querySelector(
      ".calculate-price-dialog"
    ): any)
    return el
  }

  it("has calculate price and cancel button", () => {
    const wrapper = renderDialog()

    const calculateButton = getEl(wrapper, ".calculate-button")
    assert.equal(calculateButton.textContent, "Calculate Price")

    const cancelButton = getEl(wrapper, ".cancel-button")
    assert.equal(cancelButton.textContent, "cancel")
  })

  it("can click calculate price button", () => {
    const wrapper = renderDialog()
    const auditButton = wrapper.querySelector(".calculate-button")
    ReactTestUtils.Simulate.click(auditButton)
    sinon.assert.calledWith(setVisibilityStub, false)
    sinon.assert.calledOnce(openFinancialAidCalculatorStub)
  })

  it("should have some text and a title", () => {
    const dialogText = renderDialog().textContent
    assert.include(dialogText, "Calculate Personal Course Price?")
    assert.include(dialogText, "You need to calculate your course price")
  })
})

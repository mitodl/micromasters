// @flow
import React from "react"
import PropTypes from "prop-types"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import ReactTestUtils from "react-dom/test-utils"

import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import CourseEnrollmentDialog from "./CourseEnrollmentDialog"
import { makeCourse, makeRun } from "../factories/dashboard"
import { getEl } from "../util/test_utils"

describe("CourseEnrollmentDialog", () => {
  let sandbox,
    setVisibilityStub,
    addCourseEnrollmentStub,
    openFinancialAidCalculatorStub,
    routerPushStub,
    checkoutStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    setVisibilityStub = sandbox.spy()
    addCourseEnrollmentStub = sandbox.spy()
    openFinancialAidCalculatorStub = sandbox.spy()
    routerPushStub = sandbox.spy()
    checkoutStub = sandbox.spy()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (
    hasUserApplied = false,
    courseRun = makeRun(1),
    course = makeCourse(1),
    open = true,
    financialAidAvailability = true,
    pendingFinancialAid = false
  ) => {
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <CourseEnrollmentDialog
          open={open}
          course={course}
          courseRun={courseRun}
          setVisibility={setVisibilityStub}
          addCourseEnrollment={addCourseEnrollmentStub}
          checkout={checkoutStub}
          financialAidAvailability={financialAidAvailability}
          hasUserApplied={hasUserApplied}
          pendingFinancialAid={pendingFinancialAid}
          openFinancialAidCalculator={openFinancialAidCalculatorStub}
        />
      </MuiThemeProvider>,
      {
        context:           { router: { push: routerPushStub } },
        childContextTypes: {
          router: PropTypes.object.isRequired
        }
      }
    )
    const el: HTMLElement = (document.querySelector(
      ".course-enrollment-dialog"
    ): any)
    return el
  }

  it("can render without price", () => {
    const wrapper = renderDialog()
    const payButton = ((wrapper.querySelector(
      ".pay-button"
    ): any): HTMLButtonElement)
    assert.equal(payButton.textContent, "Pay Now")
    assert.isTrue(payButton.disabled)
    const auditButton = getEl(wrapper, ".audit-button")
    assert.equal(auditButton.textContent, "Audit for Free & Pay Later")
  })

  it("can render with hasUserApplied = true", () => {
    const wrapper = renderDialog(true)
    const payButton = ((wrapper.querySelector(
      ".pay-button"
    ): any): HTMLButtonElement)
    assert.equal(payButton.textContent, "Pay Now")
    assert.isFalse(payButton.disabled)
    const auditButton = getEl(wrapper, ".audit-button")
    assert.equal(auditButton.textContent, "Audit for Free & Pay Later")
  })
  it("can render with pendingFinancialAid = true", () => {
    const wrapper = renderDialog(
      true,
      makeRun(1),
      makeCourse(1),
      true,
      true,
      true
    )
    const payButton = ((wrapper.querySelector(
      ".pay-button"
    ): any): HTMLButtonElement)
    assert.equal(payButton.textContent, "Pay Now")
    assert.isTrue(payButton.disabled)
    const auditButton = getEl(wrapper, ".audit-button")
    assert.equal(auditButton.textContent, "Audit for Free & Pay Later")
  })

  it("has a disabled pay button by default", () => {
    const wrapper = renderDialog()
    const payButton = wrapper.querySelector(".pay-button")
    ReactTestUtils.Simulate.click(payButton)
    sinon.assert.notCalled(setVisibilityStub)
    sinon.assert.notCalled(routerPushStub)
  })

  it("can click pay button with price", () => {
    const courseRun = makeRun(1)
    const wrapper = renderDialog(true, courseRun)
    const payButton = wrapper.querySelector(".pay-button")
    ReactTestUtils.Simulate.click(payButton)
    sinon.assert.calledWith(setVisibilityStub, false)
    const url = `/order_summary/?course_key=${encodeURIComponent(
      courseRun.course_id
    )}`
    sinon.assert.calledWith(routerPushStub, url)
  })

  it("can click audit button", () => {
    const courseRun = makeRun(1)
    const wrapper = renderDialog(true, courseRun)
    const auditButton = wrapper.querySelector(".audit-button")
    ReactTestUtils.Simulate.click(auditButton)
    sinon.assert.calledWith(setVisibilityStub, false)
    sinon.assert.calledWith(addCourseEnrollmentStub, courseRun.course_id)
  })

  it("can click link to calculate price", () => {
    const wrapper = renderDialog()
    const auditButton = getEl(wrapper, ".calculate-link")
    ReactTestUtils.Simulate.click(auditButton)
    sinon.assert.calledWith(setVisibilityStub, false)
    sinon.assert.calledOnce(openFinancialAidCalculatorStub)
  })

  it("pay button redirects to checkout", () => {
    const courseRun = makeRun(1)
    const wrapper = renderDialog(true, courseRun, makeCourse(1), true, false)
    const payButton = wrapper.querySelector(".pay-button")
    ReactTestUtils.Simulate.click(payButton)
    assert.equal(checkoutStub.calledWith(courseRun.course_id), true)
  })
})

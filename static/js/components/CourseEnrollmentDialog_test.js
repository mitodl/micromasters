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
  let sandbox, setVisibilityStub, addCourseEnrollmentStub, routerPushStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    setVisibilityStub = sandbox.spy()
    addCourseEnrollmentStub = sandbox.spy()
    routerPushStub = sandbox.spy()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (
    courseRun = makeRun(1),
    course = makeCourse(1),
    open = true
  ) => {
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <CourseEnrollmentDialog
          open={open}
          course={course}
          courseRun={courseRun}
          setVisibility={setVisibilityStub}
          addCourseEnrollment={addCourseEnrollmentStub}
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
    assert.equal(payButton.textContent, "Upgrade Unavailable")
    assert.isTrue(payButton.disabled)
    const auditButton = getEl(wrapper, ".audit-button")
    assert.equal(auditButton.textContent, "Enroll")
  })

  it("has a disabled pay button by default", () => {
    const wrapper = renderDialog()
    const payButton = wrapper.querySelector(".pay-button")
    ReactTestUtils.Simulate.click(payButton)
    sinon.assert.notCalled(setVisibilityStub)
    sinon.assert.notCalled(routerPushStub)
  })

  it("can click audit button", () => {
    const courseRun = makeRun(1)
    const wrapper = renderDialog(courseRun)
    const auditButton = wrapper.querySelector(".audit-button")
    ReactTestUtils.Simulate.click(auditButton)
    sinon.assert.calledWith(setVisibilityStub, false)
    sinon.assert.calledWith(addCourseEnrollmentStub, courseRun.course_id)
  })
})

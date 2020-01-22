/* global SETTINGS: false */
import React from "react"
import { shallow } from "enzyme"
import moment from "moment-timezone"
import { assert } from "chai"
import sinon from "sinon"

import SpinnerButton from "../SpinnerButton"
import CourseAction from "./CourseAction"
import { FINANCIAL_AID_PARTIAL_RESPONSE } from "../../test_constants"
import {
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_PENDING_ENROLLMENT,
  COURSE_ACTION_PAY,
  COURSE_ACTION_CALCULATE_PRICE,
  COURSE_ACTION_ENROLL,
  COURSE_ACTION_REENROLL,
  FA_STATUS_PENDING_DOCS
} from "../../constants"
import {
  findCourse,
  alterFirstRun,
  findAndCloneCourse
} from "../../util/test_utils"
import { makeCourse } from "../../factories/dashboard"

describe("CourseAction", () => {
  const now = moment()
  let sandbox
  let addCourseEnrollmentStub
  let setEnrollSelectedCourseRunStub
  let setEnrollCourseDialogVisibilityStub
  let openFinancialAidCalculatorStub
  let routerPushStub
  let checkoutStub
  let course

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    addCourseEnrollmentStub = sandbox.stub()
    setEnrollSelectedCourseRunStub = sandbox.stub()
    setEnrollCourseDialogVisibilityStub = sandbox.stub()
    openFinancialAidCalculatorStub = sandbox.stub()
    routerPushStub = sandbox.stub()
    checkoutStub = sandbox.spy()
    course = makeCourse(0)
  })

  afterEach(() => {
    sandbox.restore()
  })

  const assertCourseRunSelected = courseRun => {
    sinon.assert.calledWith(setEnrollSelectedCourseRunStub, courseRun)
  }

  const assertCourseEnrollDialogOpened = () => {
    sinon.assert.calledWith(setEnrollCourseDialogVisibilityStub, true)
  }

  const renderCourseAction = (props = {}) => {
    return shallow(
      <CourseAction
        hasFinancialAid={false}
        financialAid={{}}
        addCourseEnrollment={addCourseEnrollmentStub}
        setEnrollSelectedCourseRun={setEnrollSelectedCourseRunStub}
        setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibilityStub}
        now={now}
        courseRun={course.runs[0]}
        checkout={checkoutStub}
        openFinancialAidCalculator={openFinancialAidCalculatorStub}
        {...props}
      />,
      { context: { router: { push: routerPushStub } } }
    )
  }

  describe("course enrollment", () => {
    it("says Enroll for COURSE_ACTION_ENROLL", () => {
      const wrapper = renderCourseAction({ actionType: COURSE_ACTION_ENROLL })
      assert.equal(wrapper.find(SpinnerButton).props().children, "Enroll")
    })

    it("should handle a basic enrollment", () => {
      const wrapper = renderCourseAction({ actionType: COURSE_ACTION_ENROLL })
      wrapper.find(SpinnerButton).simulate("click")
      assertCourseRunSelected(course.runs[0])
      assertCourseEnrollDialogOpened()
    })

    it("says Re-Enroll for COURSE_ACTION_REENROLL", () => {
      const wrapper = renderCourseAction({ actionType: COURSE_ACTION_REENROLL })
      assert.equal(wrapper.find(SpinnerButton).props().children, "Re-Enroll")
    })

    for (const data of [
      ["", "", true],
      ["foo/bar/baz", "", true],
      [
        "foo/bar/baz",
        moment()
          .add(10, "days")
          .toISOString(),
        true
      ],
      [
        "",
        moment()
          .add(10, "days")
          .toISOString(),
        true
      ],
      [
        "",
        moment()
          .subtract(10, "days")
          .toISOString(),
        true
      ],
      [
        "foo/bar/baz",
        moment()
          .subtract(10, "days")
          .toISOString(),
        false
      ]
    ]) {
      it(`should ${data[2] ? "disable" : "enable"} Re-Enroll button`, () => {
        const run = course.runs[0]
        run.status = STATUS_OFFERED
        run.course_id = data[0]
        run.enrollment_start_date = data[1]

        const wrapper = renderCourseAction({
          actionType: COURSE_ACTION_REENROLL,
          courseRun:  run
        })
        assert.equal(wrapper.find(SpinnerButton).props().disabled, data[2])
      })
    }
  })

  describe("course payment", () => {
    it("says Pay for COURSE_ACTION_PAY", () => {
      const wrapper = renderCourseAction({ actionType: COURSE_ACTION_PAY })
      assert.equal(wrapper.find(".pay-button").props().children, "Pay Now")
    })
  })

  it("shows a pending disabled button if the user has status pending-enrollment", () => {
    const course = findCourse(
      course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_PENDING_ENROLLMENT
    )
    const firstRun = course.runs[0]
    const wrapper = renderCourseAction({
      courseRun:  firstRun,
      actionType: COURSE_ACTION_ENROLL
    })
    const buttonProps = wrapper.find("SpinnerButton").props()
    assert.isTrue(buttonProps.spinning)
  })

  describe("with financial aid", () => {
    let course

    beforeEach(() => {
      course = findAndCloneCourse(
        course =>
          course.runs.length > 0 && course.runs[0].status === STATUS_OFFERED
      )
    })

    it("allow user to click Enroll Now even without a calculated course price", () => {
      const firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString()
      })
      firstRun.status = STATUS_OFFERED

      const wrapper = renderCourseAction({
        courseRun:    firstRun,
        financialAid: {
          ...FINANCIAL_AID_PARTIAL_RESPONSE,
          has_user_applied: false
        },
        hasFinancialAid: true,
        actionType:      COURSE_ACTION_ENROLL
      })
      const button = wrapper.find(SpinnerButton)
      assert.isFalse(button.props().disabled)
      assert.equal(button.props().children, "Enroll *")
    })

    it("indicates that a user must calculate the course price to upgrade to paid", () => {
      const course = findAndCloneCourse(
        course =>
          course.runs.length > 0 && course.runs[0].status === STATUS_CAN_UPGRADE
      )
      const firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString()
      })

      const wrapper = renderCourseAction({
        courseRun:    firstRun,
        financialAid: {
          ...FINANCIAL_AID_PARTIAL_RESPONSE,
          has_user_applied: false
        },
        hasFinancialAid: true,
        actionType:      COURSE_ACTION_CALCULATE_PRICE
      })

      const button = wrapper.find(".pay-button")
      assert.equal(button.props().children, "Pay Now *")
    })

    it("indicates that a user can't pay for course while FA is pending", () => {
      const course = findAndCloneCourse(
        course =>
          course.runs.length > 0 && course.runs[0].status === STATUS_CAN_UPGRADE
      )
      const firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString()
      })

      const wrapper = renderCourseAction({
        courseRun:    firstRun,
        financialAid: {
          has_user_applied:   true,
          application_status: FA_STATUS_PENDING_DOCS
        },
        hasFinancialAid: true,
        actionType:      COURSE_ACTION_PAY
      })

      const button = wrapper.find(".pay-button")
      assert.isTrue(button.props().disabled)
      assert.equal(button.props().children, "Pay Now *")
    })

    it("pay button redirects to checkout", () => {
      const firstRun = alterFirstRun(course, {
        enrollment_start_date: now.toISOString(),
        status:                STATUS_CAN_UPGRADE
      })
      const wrapper = renderCourseAction({
        courseRun:       firstRun,
        hasFinancialAid: false,
        actionType:      COURSE_ACTION_PAY
      })
      const payButton = wrapper.find(".pay-button")
      payButton.simulate("click")
      assert.equal(checkoutStub.calledWith(firstRun.course_id), true)
    })
  })
})

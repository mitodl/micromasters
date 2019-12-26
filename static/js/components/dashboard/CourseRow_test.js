import React from "react"
import PropTypes from "prop-types"
import { shallow, mount } from "enzyme"
import moment from "moment"
import { assert } from "chai"
import sinon from "sinon"

import {
  makeDashboard,
  makeCourse,
  makeCoursePrices
} from "../../factories/dashboard"
import CourseRow from "./CourseRow"
import CourseAction from "./CourseAction"
import ProgressMessage from "./courses/ProgressMessage"
import StatusMessages from "./courses/StatusMessages"
import { FINANCIAL_AID_PARTIAL_RESPONSE } from "../../test_constants"
import { STATUS_NOT_PASSED } from "../../constants"
import { INITIAL_UI_STATE } from "../../reducers/ui"
import { makeRunCurrent, makeRunPast } from "./courses/test_util"
import { calculatePrices } from "../../lib/coupon"

describe("CourseRow", () => {
  let sandbox, openCourseContactDialogStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    openCourseContactDialogStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderRow = (props = {}, isShallow = false) => {
    const render = isShallow ? shallow : mount
    const dashboard = makeDashboard()
    const prices = makeCoursePrices(dashboard)
    const course =
      props.course || makeCourse(dashboard.programs[0].position_in_program)
    const couponPrices = calculatePrices(dashboard.programs, prices, [])
    return render(
      <CourseRow
        hasFinancialAid={true}
        financialAid={FINANCIAL_AID_PARTIAL_RESPONSE}
        openFinancialAidCalculator={sandbox.stub}
        now={moment()}
        addCourseEnrollment={sandbox.stub()}
        course={course}
        openCourseContactDialog={openCourseContactDialogStub}
        ui={INITIAL_UI_STATE}
        checkout={() => undefined}
        couponPrices={couponPrices}
        {...props}
      />,
      {
        context: {
          router: {}
        },
        childContextTypes: {
          router: PropTypes.object.isRequired
        }
      }
    )
  }

  it("displays relevant things for enrollable course", () => {
    const { programs } = makeDashboard()
    const course = programs[0].courses[0]
    makeRunCurrent(course.runs[0])
    const wrapper = renderRow(
      {
        course: course
      },
      true
    )
    const statusProps = wrapper.find(StatusMessages).props()
    assert.deepEqual(statusProps.course, course)
    assert.deepEqual(statusProps.hasFinancialAid, true)
    assert.deepEqual(statusProps.firstRun, course.runs[0])

    assert.deepEqual(wrapper.find(".course-title").text(), course.title)
    assert.equal(wrapper.find(".elective-tag").exists(), false)
  })

  it("displays relevant things for elective course", () => {
    const { programs } = makeDashboard()
    const course = programs[0].courses[0]
    makeRunCurrent(course.runs[0])
    course.is_elective = true
    const wrapper = renderRow(
      {
        course:              course,
        programHasElectives: true
      },
      true
    )
    assert.deepEqual(wrapper.find(".elective-tag").text(), "elective")
  })

  it("displays a CourseAction if the showStaffView prop is not set", () => {
    const { programs } = makeDashboard()
    const course = programs[0].courses[0]
    makeRunCurrent(course.runs[0])
    const wrapper = renderRow({
      course: course
    })
    assert.lengthOf(wrapper.find(CourseAction), 1)
  })

  it("does not display a button if the showStaffView prop is set", () => {
    const { programs } = makeDashboard()
    const course = programs[0].courses[0]
    makeRunCurrent(course.runs[0])
    const wrapper = renderRow({
      course:        course,
      showStaffView: true
    })
    assert.lengthOf(wrapper.find(CourseAction), 0)
  })

  it('should not display an "enroll" button if the run is not enrollable', () => {
    const { programs } = makeDashboard()
    const course = programs[0].courses[0]
    makeRunPast(course.runs[0])
    const wrapper = renderRow(
      {
        course: course
      },
      true
    )
    assert.equal(0, wrapper.find(CourseAction).length)
  })

  it("displays relevant things for an enrolled course", () => {
    const { programs } = makeDashboard()
    const course = programs[0].courses[0]
    const courseRun = course.runs[0]
    course.runs[1].status = STATUS_NOT_PASSED
    const wrapper = renderRow(
      {
        course: course
      },
      true
    )
    const progressProps = wrapper.find(ProgressMessage).props()
    assert.deepEqual(progressProps.course, course)
    assert.deepEqual(progressProps.courseRun, courseRun)
    progressProps.openCourseContactDialog("hey!")
    assert(openCourseContactDialogStub.called)

    const statusProps = wrapper.find(StatusMessages).props()
    assert.deepEqual(statusProps.course, course)
    assert.deepEqual(statusProps.firstRun, courseRun)

    assert.deepEqual(wrapper.find(".course-title").text(), course.title)
  })

  it("when enroll pay later selected", () => {
    const course = makeCourse()
    const wrapper = shallow(
      <CourseRow
        ui={{
          ...INITIAL_UI_STATE,
          showEnrollPayLaterSuccess: course.runs[0].course_id
        }}
        course={course}
      />
    )
    assert.equal(
      wrapper.find(".enroll-pay-later-heading").text(),
      "You are now auditing this course"
    )
    assert.equal(
      wrapper.find(".enroll-pay-later-txt").text(),
      "But you still need to pay to get credit."
    )
  })
})

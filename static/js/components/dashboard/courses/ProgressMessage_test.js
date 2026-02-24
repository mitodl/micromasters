/* global SETTINGS: false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import moment from "moment"

import ProgressMessage, { staffCourseInfo } from "./ProgressMessage"
import Progress from "./Progress"
import { makeCourse } from "../../../factories/dashboard"
import {
  makeRunCurrent,
  makeRunEnrolled,
  makeRunFuture,
  makeRunMissedDeadline,
  makeRunPast
} from "./test_util"
import {
  STATUS_CAN_UPGRADE,
  DASHBOARD_FORMAT,
  STATUS_MISSED_DEADLINE,
  STATUS_PAID_BUT_NOT_ENROLLED,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  COURSEWARE_BACKEND_NAMES
} from "../../../constants"
import { courseRunUrl } from "../../../util/courseware"
import { courseStartDateMessage } from "./util"

describe("Course ProgressMessage", () => {
  let sandbox, openCourseContactDialogStub, course

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    openCourseContactDialogStub = sandbox.stub()
    course = makeCourse()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderCourseDescription = (props = {}) =>
    shallow(
      <ProgressMessage
        course={course}
        openCourseContactDialog={openCourseContactDialogStub}
        courseRun={course.runs[0]}
        {...props}
      />
    )

  it("displays information for an in-progress course run", () => {
    makeRunCurrent(course.runs[0])
    const wrapper = renderCourseDescription()
    assert.equal(wrapper.find(".details").text(), "Course in progress")
  })

  it("displays information for an in-progress course run when end date is null", () => {
    makeRunCurrent(course.runs[0])
    course.runs[0].course_end_date = ""
    const wrapper = renderCourseDescription()
    assert.equal(wrapper.find(".details").text(), "Course in progress")
  })

  Object.entries(COURSEWARE_BACKEND_NAMES).forEach(([name, label]) => {
    it("displays a contact link, if appropriate, and a view on edX link", () => {
      makeRunEnrolled(course.runs[0])
      makeRunCurrent(course.runs[0])
      course.runs[0].courseware_backend = name
      course.has_contact_email = true
      const wrapper = renderCourseDescription()
      const [edxLink, contactLink] = wrapper.find("a")
      assert.equal(edxLink.props.href, courseRunUrl(course.runs[0]))
      assert.equal(edxLink.props.target, "_blank")
      assert.deepEqual(edxLink.props.children, ["View on ", label])
      assert.equal(contactLink.props.onClick, openCourseContactDialogStub)
      assert.equal(contactLink.props.children, "Contact Course Team")
    })
  })

  it("does not display contact course team or view on edX if staff user", () => {
    SETTINGS.roles.push({ role: "staff", permissions: [] })
    makeRunEnrolled(course.runs[0])
    makeRunCurrent(course.runs[0])
    course.has_contact_email = true
    const wrapper = renderCourseDescription()
    assert.lengthOf(wrapper.find("a"), 0)
  })

  it("does not display a view on edX link, if there no course key", () => {
    course.runs[0].course_id = undefined
    const wrapper = renderCourseDescription()
    assert.equal(wrapper.find("a").length, 0)
  })

  it("displays information for a future course run", () => {
    makeRunFuture(course.runs[0])
    const wrapper = renderCourseDescription()
    assert.include(wrapper.text(), courseStartDateMessage(course.runs[0]))
  })

  it("includes the <Progress /> component", () => {
    const wrapper = renderCourseDescription()
    assert.lengthOf(wrapper.find(Progress), 1)
  })

  it("should only call staffCourseInfo if showStaffView is true", () => {
    makeRunCurrent(course.runs[0])
    makeRunEnrolled(course.runs[0])
    let wrapper = renderCourseDescription({ showStaffView: true })
    assert.include(wrapper.text(), "Enrolled")
    wrapper = renderCourseDescription({ showStaffView: false })
    assert.notInclude(wrapper.text(), "Paid")
  })

  it("should show course certificate link to staff", () => {
    makeRunCurrent(course.runs[0])
    makeRunEnrolled(course.runs[0])
    SETTINGS.roles.push({ role: "staff", permissions: [] })
    let wrapper = renderCourseDescription()
    assert.lengthOf(wrapper.find("a"), 0)
    course.certificate_url = "certificate/url"
    wrapper = renderCourseDescription()
    assert.include(wrapper.find("a").text(), "View Certificate")
  })

  describe("staffCourseInfo", () => {
    it("should return nothing if the user is not enrolled", () => {
      makeRunCurrent(course.runs[0])
      assert.isNull(staffCourseInfo(course.runs[0], course))
    })

    it("should return enrolled if course current", () => {
      makeRunCurrent(course.runs[0])
      makeRunEnrolled(course.runs[0])
      assert.equal("Enrolled", staffCourseInfo(course.runs[0], course))
    })

    it("should return enrolled if course current and end date is empty", () => {
      makeRunCurrent(course.runs[0])
      makeRunEnrolled(course.runs[0])
      course.runs[0].course_end_date = ""
      assert.equal("Enrolled", staffCourseInfo(course.runs[0], course))
    })

    it("should return auditing and upgrade date, if course in progress", () => {
      makeRunCurrent(course.runs[0])
      course.runs[0].status = STATUS_CAN_UPGRADE
      assert.equal(
        staffCourseInfo(course.runs[0], course),
        `Auditing (Upgrade deadline ${moment(
          course.runs[0].course_upgrade_deadline
        ).format(DASHBOARD_FORMAT)})`
      )
    })

    it("should return auditing, if course upcoming", () => {
      makeRunFuture(course.runs[0])
      course.runs[0].status = STATUS_CAN_UPGRADE
      assert.equal(staffCourseInfo(course.runs[0], course), "Auditing")
    })

    it("should show missed deadline", () => {
      makeRunCurrent(course.runs[0])
      course.runs[0].status = STATUS_MISSED_DEADLINE
      assert.equal(
        staffCourseInfo(course.runs[0], course),
        "Missed upgrade deadline"
      )
    })

    it("should return paid but not enrolled", () => {
      makeRunCurrent(course.runs[0])
      course.runs[0].status = STATUS_PAID_BUT_NOT_ENROLLED
      assert.equal(
        staffCourseInfo(course.runs[0], course),
        "Paid but not enrolled"
      )
    })

    it("should return passed", () => {
      makeRunPast(course.runs[0])
      course.runs[0].status = STATUS_PASSED
      assert.equal(staffCourseInfo(course.runs[0], course), "Passed")
    })

    it("should describe passing the edX course and can schedule an exam", () => {
      makeRunPast(course.runs[0])
      course.runs[0].status = STATUS_PASSED
      course.can_schedule_exam = true
      course.has_exam = true
      assert.equal(
        staffCourseInfo(course.runs[0], course),
        "Passed edX course. Authorized to schedule exam."
      )
    })

    it("should describe passing the edX course but not the exam", () => {
      makeRunPast(course.runs[0])
      course.runs[0].status = STATUS_PASSED
      course.can_schedule_exam = false
      course.has_exam = true
      assert.equal(
        staffCourseInfo(course.runs[0], course),
        "Passed edX course, did not pass exam"
      )
    })

    it("should return did not pass, if paid", () => {
      makeRunPast(course.runs[0])
      course.runs[0].status = STATUS_NOT_PASSED
      assert.equal(staffCourseInfo(course.runs[0], course), "Did not pass")
    })

    it("should return audited, did not pass, if not paid", () => {
      makeRunPast(course.runs[0])
      course.runs[0].status = STATUS_NOT_PASSED
      assert.equal(staffCourseInfo(course.runs[0], course), "Did not pass")
    })

    it("should return Audited, passed, did not pay", () => {
      makeRunPast(course.runs[0])
      makeRunPast(course.runs[1])
      course.runs[0].status = STATUS_NOT_PASSED
      course.runs[1].status = STATUS_CAN_UPGRADE
      assert.equal(staffCourseInfo(course.runs[0], course), "Audited, passed")
    })
    it("should return Audited, missed upgrade deadline", () => {
      makeRunPast(course.runs[0])
      makeRunPast(course.runs[1])
      course.runs[0].status = STATUS_NOT_PASSED
      course.runs[1].status = STATUS_MISSED_DEADLINE
      assert.equal(
        staffCourseInfo(course.runs[0], course),
        "Audited, missed upgrade deadline"
      )
    })

    it("should return Paid when course is past, but still currently-enrolled", () => {
      makeRunPast(course.runs[0])
      makeRunEnrolled(course.runs[0])
      makeRunMissedDeadline(course.runs[1])
      makeRunPast(course.runs[1])
      assert.equal(staffCourseInfo(course.runs[0], course), "Enrolled")
    })
  })
})

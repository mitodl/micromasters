/* global SETTINGS */
import React from "react"
import { shallow } from "enzyme"
import moment from "moment"
import { assert } from "chai"

import CourseDescription from "./CourseDescription"
import {
  findCourse,
  findAndCloneCourse,
  alterFirstRun
} from "../../util/test_utils"
import {
  DASHBOARD_FORMAT,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_CAN_UPGRADE,
  STATUS_MISSED_DEADLINE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_OFFERED,
  STATUS_WILL_ATTEND,
  STATUS_PENDING_ENROLLMENT,
  ALL_COURSE_STATUSES
} from "../../constants"

describe("CourseDescription", () => {
  let getElements = renderedComponent => ({
    titleText:   renderedComponent.find(".course-title").text(),
    edxLink:     renderedComponent.find("a.view-edx-link"),
    contactLink: renderedComponent.find("a.contact-link"),
    detailsText: renderedComponent.find(".course-details").text(),
    statusText:  renderedComponent.find(".status").text()
  })

  let renderCourseDescription = (
    courseRun,
    courseTitle,
    hasContactEmail = true
  ) =>
    shallow(
      <CourseDescription
        courseRun={courseRun}
        courseTitle={courseTitle}
        hasContactEmail={hasContactEmail}
      />
    )

  it("shows the course title", () => {
    for (let status of ALL_COURSE_STATUSES) {
      let course = findAndCloneCourse(
        course => course.runs.length > 0 && course.runs[0].status === status
      )
      let firstRun = course.runs[0]
      firstRun.enrollment_url = "http://example.com"
      const wrapper = renderCourseDescription(firstRun, course.title)
      let elements = getElements(wrapper)

      assert.include(elements.titleText, course.title)
    }
  })

  it("shows a course link for an audited course run that has already started", () => {
    const EXPECTED_STATUSES = [STATUS_CAN_UPGRADE, STATUS_MISSED_DEADLINE]

    for (let status of EXPECTED_STATUSES) {
      let course = findAndCloneCourse(
        course => course.runs.length > 0 && course.runs[0].status === status
      )
      let firstRun = course.runs[0]
      firstRun.course_start_date = moment()
        .subtract(2, "days")
        .format()
      firstRun.course_id = "example+run"
      firstRun.enrollment_url = null
      const wrapper = renderCourseDescription(firstRun, course.title)
      let elements = getElements(wrapper)

      assert.equal(elements.edxLink.text(), "View on edX")
      assert.isAbove(elements.edxLink.props().href.length, 0)
      assert.include(elements.edxLink.props().href, firstRun.course_id)
    }
  })

  it("shows an enrollment link for an audited course run that starts in the future", () => {
    const EXPECTED_STATUSES = [STATUS_CAN_UPGRADE, STATUS_MISSED_DEADLINE]

    for (let status of EXPECTED_STATUSES) {
      let course = findAndCloneCourse(
        course => course.runs.length > 0 && course.runs[0].status === status
      )
      let firstRun = course.runs[0]
      const START_DATES_TO_TEST = [
        moment()
          .add(2, "days")
          .format(),
        null
      ]
      for (let courseStartDate of START_DATES_TO_TEST) {
        firstRun.course_start_date = courseStartDate
        firstRun.enrollment_url = "http://example.com"
        const wrapper = renderCourseDescription(firstRun, course.title)
        let elements = getElements(wrapper)
        assert.equal(elements.edxLink.text(), "View on edX")
        assert.isAbove(elements.edxLink.props().href.length, 0)
        assert.include(elements.edxLink.props().href, firstRun.enrollment_url)
      }
    }
  })

  it("shows a course link for an enrolled course run with a course id", () => {
    const EXPECTED_STATUSES = [
      STATUS_CURRENTLY_ENROLLED,
      STATUS_PASSED,
      STATUS_NOT_PASSED
    ]

    for (let status of EXPECTED_STATUSES) {
      let course = findAndCloneCourse(
        course => course.runs.length > 0 && course.runs[0].status === status
      )
      let firstRun = course.runs[0]
      firstRun.course_start_date = moment()
        .add(2, "days")
        .format()
      firstRun.course_id = "example+run"
      const wrapper = renderCourseDescription(firstRun, course.title)
      let elements = getElements(wrapper)
      assert.equal(elements.edxLink.text(), "View on edX")
      assert.isAbove(elements.edxLink.props().href.length, 0)
      assert.include(elements.edxLink.props().href, firstRun.course_id)
    }
  })

  it("does not show a link to view the course on edX if the course run lacks an id", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_PASSED
    )
    let firstRun = course.runs[0]
    firstRun.course_id = null
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)

    assert.lengthOf(elements.edxLink, 0)
  })

  it("does not show a link to view the course on edX if the user is staff", () => {
    SETTINGS.roles = [
      {
        role:    "staff",
        program: 1
      }
    ]
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_PASSED
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)

    assert.lengthOf(elements.edxLink, 0)
  })

  it("shows a link to contact the course team", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title, true)
    let elements = getElements(wrapper)

    assert.isAbove(elements.contactLink.length, 0)
    assert.equal(elements.contactLink.text(), "Contact Course Team")
  })

  it("does not show a link to contact the course team if there is no contact email", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title, false)
    let elements = getElements(wrapper)

    assert.lengthOf(elements.contactLink, 0)
  })

  it("shows an enrollment link for an unenrolled course run with an enrollment url", () => {
    const EXPECTED_STATUSES = [
      STATUS_OFFERED,
      STATUS_PENDING_ENROLLMENT,
      STATUS_WILL_ATTEND
    ]

    for (let status of EXPECTED_STATUSES) {
      let course = findAndCloneCourse(
        course => course.runs.length > 0 && course.runs[0].status === status
      )
      let firstRun = course.runs[0]
      firstRun.enrollment_url = "http://example.com"
      const wrapper = renderCourseDescription(firstRun, course.title)
      let elements = getElements(wrapper)
      assert.equal(elements.edxLink.text(), "View on edX")
      assert.isAbove(elements.edxLink.props().href.length, 0)
      assert.include(elements.edxLink.props().href, firstRun.enrollment_url)
    }
  })

  it("shows both an edX link and a course contact link when both are enabled", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    )
    let firstRun = course.runs[0]
    firstRun.course_id = "example+run"
    const wrapper = renderCourseDescription(firstRun, course.title, true)
    let elements = getElements(wrapper)

    assert.isAbove(elements.edxLink.length, 0)
    assert.equal(elements.edxLink.text(), "View on edX")
    assert.isAbove(elements.contactLink.length, 0)
    assert.equal(elements.contactLink.text(), "Contact Course Team")
    assert.equal(wrapper.find(".course-links span").text(), " | ")
  })

  it("does not show an edX link for an unenrolled course run with no enrollment url", () => {
    const EXPECTED_STATUSES = [
      STATUS_OFFERED,
      STATUS_PENDING_ENROLLMENT,
      STATUS_WILL_ATTEND
    ]

    for (let status of EXPECTED_STATUSES) {
      let course = findAndCloneCourse(
        course => course.runs.length > 0 && course.runs[0].status === status
      )
      let firstRun = course.runs[0]
      firstRun.enrollment_url = null
      const wrapper = renderCourseDescription(firstRun, course.title)
      let elements = getElements(wrapper)
      assert.lengthOf(elements.edxLink, 0)
    }
  })

  it("does show date with status passed", () => {
    let course = findCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_PASSED
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    let courseEndDate = moment(firstRun.course_end_date)
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT)

    assert.include(elements.detailsText, `Ended: ${formattedDate}`)
  })

  it("hides an invalid date with status passed", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_PASSED
    )
    let firstRun = alterFirstRun(course, { course_end_date: "1999-13-92" })
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    assert.equal(elements.detailsText, "")
  })

  it("does show date with status not-passed", () => {
    let course = findCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_NOT_PASSED
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    let courseEndDate = moment(firstRun.course_end_date)
    let formattedDate = courseEndDate.format(DASHBOARD_FORMAT)
    assert.equal(elements.detailsText, `Ended: ${formattedDate}`)
  })

  it("hides an invalid date with status not-passed", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_NOT_PASSED
    )
    let firstRun = alterFirstRun(course, { course_end_date: "1999-13-92" })
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    assert.equal(elements.detailsText, "")
  })

  it("does not show anything when there are no runs for a course", () => {
    const wrapper = shallow(
      <CourseDescription courseRun={{}} courseTitle={null} />
    )
    let elements = getElements(wrapper)

    assert.equal(
      elements.detailsText,
      "No future courses are currently scheduled."
    )
  })

  it("does show date with status verified", () => {
    let course = findCourse(
      course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    let courseStartDate = moment(firstRun.course_start_date)
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT)
    assert.equal(elements.detailsText, `Start date: ${formattedDate}`)
  })

  it("hides an invalid date with status verified", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 &&
        course.runs[0].status === STATUS_CURRENTLY_ENROLLED
    )
    let firstRun = alterFirstRun(course, { course_start_date: "1999-13-92" })
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    assert.equal(elements.detailsText, "")
  })

  it("does show date with status enrolled", () => {
    let course = findCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_CAN_UPGRADE
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    let courseStartDate = moment(firstRun.course_start_date)
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT)
    assert.include(elements.detailsText, `Start date: ${formattedDate}`)
  })

  it("hides an invalid date with status enrolled", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_CAN_UPGRADE
    )
    let firstRun = alterFirstRun(course, { course_start_date: "1999-13-92" })
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    assert.notInclude(elements.detailsText, "Start date: ")
  })

  it("does show date with status offered", () => {
    let course = findCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_OFFERED
    )
    let firstRun = course.runs[0]
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    let courseStartDate = moment(firstRun.course_start_date)
    let formattedDate = courseStartDate.format(DASHBOARD_FORMAT)

    assert.equal(elements.detailsText, `Start date: ${formattedDate}`)
  })

  it("shows fuzzy start date for a future offered course run that has no start date", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_OFFERED
    )
    let fuzzyStartDate = "Spring 2016"
    let firstRun = course.runs[0]
    firstRun.fuzzy_start_date = fuzzyStartDate
    firstRun.course_start_date = null
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)

    assert.equal(elements.detailsText, `Coming ${fuzzyStartDate}`)
  })

  it("shows nothing if a course run lacks a start date and fuzzy start date", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_OFFERED
    )
    let firstRun = course.runs[0]
    firstRun.fuzzy_start_date = null
    firstRun.course_start_date = null
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)

    assert.equal(elements.detailsText, "")
  })

  it("hides an invalid date with status offered", () => {
    let course = findAndCloneCourse(
      course =>
        course.runs.length > 0 && course.runs[0].status === STATUS_OFFERED
    )
    let firstRun = alterFirstRun(course, { course_start_date: "1999-13-92" })
    const wrapper = renderCourseDescription(firstRun, course.title)
    let elements = getElements(wrapper)
    assert.equal(elements.detailsText, "")
  })

  it("shows a message when the user is auditing the course", () => {
    [STATUS_CAN_UPGRADE, STATUS_MISSED_DEADLINE].forEach(auditStatus => {
      let course = findCourse(
        course =>
          course.runs.length > 0 && course.runs[0].status === auditStatus
      )
      let firstRun = course.runs[0]
      const wrapper = renderCourseDescription(firstRun, course.title)
      let elements = getElements(wrapper)

      assert.include(elements.statusText, "Auditing")
    })
  })

  it("shows a status when the user paid for the course", () => {
    [
      STATUS_CURRENTLY_ENROLLED,
      STATUS_PASSED,
      STATUS_NOT_PASSED
    ].forEach(auditStatus => {
      let course = findCourse(
        course =>
          course.runs.length > 0 && course.runs[0].status === auditStatus
      )
      let firstRun = course.runs[0]
      const wrapper = renderCourseDescription(firstRun, course.title)
      let elements = getElements(wrapper)

      assert.include(elements.statusText, "Paid")
    })
  })
})

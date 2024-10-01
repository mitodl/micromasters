// @flow
/* global SETTINGS: false */
/* eslint-disable no-unused-vars */
import _ from "lodash"
import Decimal from "decimal.js-light"
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import moment from "moment-timezone"
import { formatPrettyDateTimeAmPmTz, parseDateString } from "../../../util/date"

import {
  formatAction,
  formatMessage,
  formatDate,
  calculateMessages
} from "./StatusMessages"
import {
  makeCourse,
  makeProctoredExamResult,
  makeProgram,
  makeCoupon
} from "../../../factories/dashboard"
import {
  makeRunCurrent,
  makeRunPaid,
  makeRunEnrolled,
  makeRunPassed,
  makeRunPast,
  makeRunFuture,
  makeRunOverdue,
  makeRunDueSoon,
  makeRunFailed,
  makeRunCanUpgrade,
  makeRunMissedDeadline
} from "./test_util"
import { assertIsJust } from "../../../lib/test_utils"
import {
  COURSE_ACTION_PAY,
  COURSE_ACTION_CALCULATE_PRICE,
  COURSE_ACTION_REENROLL,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  DASHBOARD_FORMAT,
  COURSE_DEADLINE_FORMAT,
  STATUS_PAID_BUT_NOT_ENROLLED,
  FA_STATUS_PENDING_DOCS,
  STATUS_MISSED_DEADLINE,
  COURSE_ACTION_ENROLL
} from "../../../constants"
import * as libCoupon from "../../../lib/coupon"
import { FINANCIAL_AID_PARTIAL_RESPONSE } from "../../../test_constants"

describe("Course Status Messages", () => {
  let message

  beforeEach(() => {
    message = {
      message: <div>TEST MESSAGE</div>
    }
  })

  describe("formatMessage", () => {
    it("should format a basic message", () => {
      const renderedMessage = shallow(formatMessage(message))
      assert.equal(renderedMessage.props().className, "status-message cols")
      assert.equal(
        renderedMessage.find(".message.first-col").text(),
        "TEST MESSAGE"
      )
    })

    it("should format a message with an action", () => {
      const msg = { action: <button>button!</button>, ...message }
      const renderedMessage = shallow(formatMessage(msg))
      assert.equal(renderedMessage.find(".second-col button").length, 1)
    })
  })

  describe("formatAction", () => {
    it("should just wrap an action in a div", () => {
      const action = shallow(
        formatAction({ action: <button>button!</button>, message: "test" })
      )
      assert.equal(action.type(), "div")
      assert.equal(action.props().className, "second-col")
      assert.equal(action.find("button").length, 1)
    })
  })

  describe("calculateMessages", () => {
    let course, sandbox, financialAid, calculateMessagesProps

    beforeEach(() => {
      course = makeCourse(0)
      sandbox = sinon.sandbox.create()
      financialAid = _.cloneDeep(FINANCIAL_AID_PARTIAL_RESPONSE)

      calculateMessagesProps = {
        courseAction:                      sandbox.stub(),
        financialAid:                      financialAid,
        hasFinancialAid:                   false,
        firstRun:                          course.runs[0],
        course:                            course,
        expandedStatuses:                  new Set(),
        setShowExpandedCourseStatus:       sandbox.stub(),
        setExamEnrollmentDialogVisibility: sandbox.stub(),
        setSelectedExamCouponCourse:       sandbox.stub(),
        coupon:                            undefined
      }
      calculateMessagesProps.courseAction.returns("course action was called")
    })

    afterEach(() => {
      sandbox.restore()
    })

    it("should have a message for STATUS_PAID_BUT_NOT_ENROLLED for FA", () => {
      [true, false].forEach(finAid => {
        course.runs[0].status = STATUS_PAID_BUT_NOT_ENROLLED
        course.runs[0].has_paid = true
        calculateMessagesProps["hasFinancialAid"] = finAid
        course.runs[1].has_paid = true
        makeRunCurrent(course.runs[0])
        makeRunFuture(course.runs[1])
        const [{ message, action }] = calculateMessages(
          calculateMessagesProps
        ).value
        const mounted = shallow(message)
        assert.equal(
          mounted.text(),
          "You paid for this course but are not enrolled. You can enroll now, or if you" +
            " think there is a problem, contact us for help."
        )
        assert.equal(
          mounted.find("a").props().href,
          `mailto:${SETTINGS.support_email}`
        )
        assert.equal(action, "course action was called")
        assert(
          calculateMessagesProps.courseAction.calledWith(
            course.runs[0],
            COURSE_ACTION_ENROLL
          )
        )
      })
    })

    it("should show next promised course", () => {
      course.runs[0].fuzzy_start_date = "Fall 2018"

      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: "Next course starts Fall 2018."
        }
      ])
    })

    it("should nag unpaid auditors to pay", () => {
      makeRunCurrent(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      course.runs[0].course_upgrade_deadline = moment().format()
      const dueDate = moment(course.runs[0].course_upgrade_deadline)
        .tz(moment.tz.guess())
        .format(COURSE_DEADLINE_FORMAT)
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          action:  "course action was called",
          message: `You are auditing. To get credit, you need to pay for the course. (Payment due on ${dueDate})`
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_PAY
        )
      )
    })

    it("should ask to pay for a new grade, if already has a certificate ", () => {
      makeRunCurrent(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      course.certificate_url = "certificate"
      const messages = calculateMessages(calculateMessagesProps).value
      assert.equal(messages.length, 2)
      const mounted = shallow(messages[0]["message"])

      assert.equal(
        mounted.text(),
        "You passed this course! View Certificate | Re-enroll"
      )

      assert.deepEqual(messages[1], {
        action:  "course action was called",
        message:
          "You are re-taking this course. To get a new grade, you need to pay again."
      })

      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_PAY
        )
      )
    })

    it("should tell auditors to calculate price and pay for course", () => {
      makeRunCurrent(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      course.runs[0].course_upgrade_deadline = moment().format()
      const dueDate = moment(course.runs[0].course_upgrade_deadline)
        .tz(moment.tz.guess())
        .format(COURSE_DEADLINE_FORMAT)
      calculateMessagesProps["hasFinancialAid"] = true

      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          action:  "course action was called",
          message: `You are auditing. To get credit, you need to pay for the course. (Payment due on ${dueDate})`
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_CALCULATE_PRICE
        )
      )
    })

    it("should tell auditors to wait while FA application is pending", () => {
      makeRunCurrent(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      course.runs[0].course_upgrade_deadline = moment().format()
      const dueDate = moment(course.runs[0].course_upgrade_deadline)
        .tz(moment.tz.guess())
        .format(COURSE_DEADLINE_FORMAT)
      calculateMessagesProps["financialAid"][
        "application_status"
      ] = FA_STATUS_PENDING_DOCS
      calculateMessagesProps["hasFinancialAid"] = true

      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          action:  "course action was called",
          message:
            "You are auditing. Your personal course price is pending, " +
            `and needs to be approved before you can pay for courses. (Payment due on ${dueDate})`
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_PAY
        )
      )
    })

    it("should tell auditors to wait while FA is pending without due date", () => {
      makeRunCurrent(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      calculateMessagesProps["financialAid"]["application_status"] =
        "pending-docs"
      calculateMessagesProps["hasFinancialAid"] = true

      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          action:  "course action was called",
          message:
            "You are auditing. Your personal course price is pending, " +
            "and needs to be approved before you can pay for courses."
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_PAY
        )
      )
    })

    it("should not show payment due date if missing", () => {
      makeRunCurrent(course.runs[0])
      makeRunCanUpgrade(course.runs[0])

      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          action:  "course action was called",
          message:
            "You are auditing. To get credit, you need to pay for the course."
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_PAY
        )
      )
    })

    describe("should prompt users who are paid and passed but course is in progress, if applicable", () => {
      beforeEach(() => {
        makeRunCurrent(course.runs[0])
        makeRunPaid(course.runs[0])
        makeRunPassed(course.runs[0])
      })

      it("should prompt when passed the course", () => {
        course.has_exam = true
        course.is_passed = true

        const messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages[0]["message"], "You passed this course.")
      })
    })

    it("should congratulate the user on passing, exam or no", () => {
      makeRunPast(course.runs[0])
      makeRunPassed(course.runs[0])
      makeRunPaid(course.runs[0])
      course.is_passed = true
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: "You passed this course."
        }
      ])
      course.has_exam = true
      course.proctorate_exams_grades = [makeProctoredExamResult()]
      course.proctorate_exams_grades[0].passed = true
      const messages = calculateMessages(calculateMessagesProps).value
      assert.equal(messages.length, 1)
      assert.equal(messages[0]["message"], "You passed this course.")
      course.certificate_url = "certificate_url"
      const [{ message }] = calculateMessages(calculateMessagesProps).value
      const mounted = shallow(message)
      assert.equal(
        mounted.text(),
        "You passed this course! View Certificate | Re-enroll"
      )
      assert.equal(
        mounted
          .find("a")
          .at(0)
          .props().href,
        "certificate_url"
      )
      mounted
        .find("a")
        .at(1)
        .props()
        .onClick()
      assert(calculateMessagesProps.setShowExpandedCourseStatus.called)
    })

    it("should nag about missing the payment deadline", () => {
      makeRunPast(course.runs[0])
      makeRunMissedDeadline(course.runs[0])
      makeRunOverdue(course.runs[0])
      makeRunFuture(course.runs[1])
      course.runs[1].enrollment_start_date = moment()
        .subtract(10, "days")
        .toISOString()
      const date = formatDate(course.runs[1].course_start_date)
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            `You missed the payment deadline, but you can re-enroll. Next course starts ${date}.` +
            ` Enrollment started ${formatDate(
              course.runs[1].enrollment_start_date
            )}.`,
          action: "course action was called"
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[1],
          COURSE_ACTION_REENROLL
        )
      )
    })

    it("should nag about missing the payment deadline for future course with one run", () => {
      course.runs = [course.runs[0]]
      course.runs[0].course_start_date = ""
      course.runs[0].course_end_date = ""
      course.runs[0].fuzzy_start_date = "Spring 2019"
      course.runs[0].status = STATUS_MISSED_DEADLINE
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You missed the payment deadline and will not receive MicroMasters credit for this course. " +
            "There are no future runs of this course scheduled at this time."
        }
      ])
    })

    it("should nag about missing the payment deadline for current course with one run", () => {
      course.runs = [course.runs[0]]
      makeRunCurrent(course.runs[0])
      course.runs[0].status = STATUS_MISSED_DEADLINE
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You missed the payment deadline and will not receive MicroMasters credit for this course. " +
            "There are no future runs of this course scheduled at this time."
        }
      ])
    })

    for (const nextEnrollmentStart of [
      ["", ""],
      [
        moment()
          .add(10, "days")
          .toISOString(),
        ` Enrollment starts ${formatDate(moment().add(10, "days"))}.`
      ]
    ]) {
      it(`should nag about missing the payment deadline when future re-enrollments and date is ${nextEnrollmentStart[0]}`, () => {
        makeRunPast(course.runs[0])
        makeRunMissedDeadline(course.runs[0])
        makeRunOverdue(course.runs[0])
        makeRunFuture(course.runs[1])
        course.runs[1].enrollment_start_date = nextEnrollmentStart[0]
        const date = formatDate(course.runs[1].course_start_date)
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message: `You missed the payment deadline, but you can re-enroll. Next course starts ${date}.${nextEnrollmentStart[1]}`,
            action:  "course action was called"
          }
        ])
        assert(
          calculateMessagesProps.courseAction.calledWith(
            course.runs[1],
            COURSE_ACTION_REENROLL
          )
        )
      })
    }

    it("should have a message for missing the payment deadline with no future courses", () => {
      course.runs = [course.runs[0]]
      makeRunPast(course.runs[0])
      makeRunMissedDeadline(course.runs[0])
      makeRunOverdue(course.runs[0])
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You missed the payment deadline and will not receive MicroMasters credit for this course. " +
            "There are no future runs of this course scheduled at this time."
        }
      ])
    })

    it("should nag about paying after the edx course is complete", () => {
      makeRunPast(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      makeRunDueSoon(course.runs[0])
      const date = moment(course.runs[0].course_upgrade_deadline).format(
        DASHBOARD_FORMAT
      )
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: `The edX course is complete, but you need to pay to get credit. (Payment due on ${date})`,
          action:  "course action was called"
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_PAY
        )
      )
    })

    it("should nag about paying after the edx course is complete with no deadline", () => {
      makeRunPast(course.runs[0])
      makeRunCanUpgrade(course.runs[0])

      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "The edX course is complete, but you need to pay to get credit.",
          action: "course action was called"
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[0],
          COURSE_ACTION_PAY
        )
      )
    })

    it("should encourage the user to re-enroll after failing", () => {
      makeRunPast(course.runs[0])
      makeRunFailed(course.runs[0])
      makeRunFuture(course.runs[1])
      course.runs[1].enrollment_start_date = moment()
        .subtract(10, "days")
        .toISOString()
      const date = formatPrettyDateTimeAmPmTz(
        parseDateString(course.runs[1].course_start_date)
      )
      const enrollmentDate = moment(
        course.runs[1].enrollment_start_date
      ).format(DASHBOARD_FORMAT)
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You did not pass the course, but you can re-enroll." +
            ` Next course starts ${date}. Enrollment started ${enrollmentDate}.`,
          action: "course action was called"
        }
      ])
      assert(
        calculateMessagesProps.courseAction.calledWith(
          course.runs[1],
          COURSE_ACTION_REENROLL
        )
      )
    })

    for (const nextEnrollmentStart of [
      ["", ""],
      [
        moment()
          .add(10, "days")
          .toISOString(),
        ` Enrollment starts ${formatDate(moment().add(10, "days"))}.`
      ]
    ]) {
      it(`should inform next enrollment date after failing edx course when date is ${nextEnrollmentStart[0]}`, () => {
        makeRunPast(course.runs[0])
        makeRunFailed(course.runs[0])
        makeRunFuture(course.runs[1])
        course.runs[1].enrollment_start_date = nextEnrollmentStart[0]
        const date = formatPrettyDateTimeAmPmTz(
          parseDateString(course.runs[1].course_start_date)
        )
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message: `You did not pass the course, but you can re-enroll. Next course starts ${date}.${nextEnrollmentStart[1]}`,
            action:  "course action was called"
          }
        ])
        assert(
          calculateMessagesProps.courseAction.calledWith(
            course.runs[1],
            COURSE_ACTION_REENROLL
          )
        )
      })
    }

    it("should let the user know they did not pass, when there are no future runs", () => {
      course.runs = course.runs.slice(0, 1)
      makeRunPast(course.runs[0])
      makeRunFailed(course.runs[0])
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: "You did not pass the course."
        }
      ])
    })

    it("should not have a message if course is past but still not frozen", () => {
      makeRunPast(course.runs[0])
      makeRunEnrolled(course.runs[0])
      makeRunPaid(course.runs[0])
      makeRunMissedDeadline(course.runs[1])
      makeRunPast(course.runs[1])
      assertIsJust(calculateMessages(calculateMessagesProps), [])
    })
  })
})

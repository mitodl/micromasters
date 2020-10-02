// @flow
/* global SETTINGS: false */
import _ from "lodash"
import Decimal from "decimal.js-light"
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import moment from "moment-timezone"

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
      SETTINGS.FEATURES.ENABLE_EDX_EXAMS = false

      calculateMessagesProps = {
        courseAction:                sandbox.stub(),
        financialAid:                financialAid,
        hasFinancialAid:             false,
        firstRun:                    course.runs[0],
        course:                      course,
        expandedStatuses:            new Set(),
        setShowExpandedCourseStatus: sandbox.stub(),
        coupon:                      undefined
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

    it("should include information about a course coupon", () => {
      const makeAmountMessageStub = sandbox
        .stub(libCoupon, "makeAmountMessage")
        .returns("all of the money")
      const makeCouponTargetMessageStub = sandbox
        .stub(libCoupon, "makeCouponReason")
        .returns(", because why not")
      const program = makeProgram()
      const coupon = makeCoupon(program)
      coupon.content_type = COUPON_CONTENT_TYPE_COURSE
      coupon.object_id = program.courses[0].id
      calculateMessagesProps.course = program.courses[0]
      makeRunCurrent(calculateMessagesProps.course.runs[0])
      makeRunEnrolled(calculateMessagesProps.course.runs[0])
      calculateMessagesProps.coupon = coupon
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You will get all of the money off the cost for this course, because why not."
        }
      ])
      assert.isTrue(makeAmountMessageStub.calledWith(coupon))
      assert.isTrue(makeCouponTargetMessageStub.calledWith(coupon))
    })

    it("should display 'You will receive 100% off' message", () => {
      const program = makeProgram()
      const coupon = makeCoupon(program)
      coupon.content_type = COUPON_CONTENT_TYPE_COURSE
      coupon.object_id = program.courses[0].id
      coupon.amount_type = COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT
      coupon.amount = Decimal("1")
      calculateMessagesProps.course = program.courses[0]
      calculateMessagesProps.coupon = coupon
      const messages = calculateMessages(calculateMessagesProps).value

      assert.equal(
        messages[0]["message"],
        "You will get 100% off the cost for this course."
      )
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

    describe("should prompt users who are paid and enrolled in the class, if applicable", () => {
      beforeEach(() => {
        makeRunCurrent(course.runs[0])
        makeRunPaid(course.runs[0])
        makeRunEnrolled(course.runs[0])
      })

      it("should prompt to sign up for future", () => {
        course.has_exam = true
        course.can_schedule_exam = false
        course.exams_schedulable_in_future = [
          moment()
            .add(2, "day")
            .format()
        ]

        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "You can sign up to take the exam starting on " +
              `on ${formatDate(course.exams_schedulable_in_future[0])}.`
          }
        ])
      })

      it("should inform that no exam is avaiable", () => {
        course.has_exam = true
        course.can_schedule_exam = false
        course.exams_schedulable_in_future = []

        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "There are currently no exams available for scheduling. Please check back later."
          }
        ])
      })
    })
    describe("should prompt users who are paid and passed but course is in progress, if applicable", () => {
      beforeEach(() => {
        makeRunCurrent(course.runs[0])
        makeRunPaid(course.runs[0])
        makeRunPassed(course.runs[0])
      })

      it("should prompt to schedule exam", () => {
        course.has_exam = true
        course.can_schedule_exam = true

        const messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages.length, 2)
        assert.equal(
          messages[0]["message"],
          "Click above to schedule an exam with Pearson."
        )
        const mounted = shallow(messages[1]["message"])
        assert.equal(
          mounted.text().trim(),
          "If you want to re-take the course you can re-enroll."
        )
      })

      it("should prompt about future exams if already passed exam", () => {
        course.has_exam = true
        course.can_schedule_exam = true
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = true
        const messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages[0]["message"], "You passed this course.")
        assert.equal(
          messages[1]["message"],
          "Click above to reschedule an exam with Pearson."
        )
        const mounted = shallow(messages[2]["message"])
        assert.equal(
          mounted.text().trim(),
          "If you want to re-take the course you can re-enroll."
        )
      })

      it("should prompt when passed the course and exam", () => {
        course.has_exam = true
        course.can_schedule_exam = true
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = true

        const messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages[0]["message"], "You passed this course.")
        assert.equal(
          messages[1]["message"],
          "Click above to reschedule an exam with Pearson."
        )
        const mounted = shallow(messages[2]["message"])
        assert.equal(
          mounted.text().trim(),
          "If you want to re-take the course you can re-enroll."
        )
      })
    })

    describe("should prompt users who pass the class to take the exam, if applicable", () => {
      beforeEach(() => {
        makeRunPast(course.runs[0])
        makeRunPassed(course.runs[0])
        makeRunPaid(course.runs[0])
        makeRunFuture(course.runs[1])
        course.has_exam = true
      })

      it("should not prompt to re-enroll if there is no future course run", () => {
        course.runs = [course.runs[0]]
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "There are currently no exams available for scheduling. Please check back later."
          }
        ])
      })
      // Cases with failed exam attempts
      it("should prompt the user to schedule another exam", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = true
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "You did not pass the exam. Click above to reschedule an exam with Pearson."
          }
        ])
      })

      it("should ask to pay and schedule another exam even when there is another run", () => {
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = true
        course.has_to_pay = true
        const messages = calculateMessages(calculateMessagesProps).value
        assert.deepEqual(messages[0], {
          message:
            "You did not pass the exam. If you want to re-take the exam, you need to pay again. ",
          action: "course action was called"
        })
        const mounted = shallow(messages[1]["message"])
        assert.equal(
          mounted.text().trim(),
          "If you want to re-take the course you can re-enroll."
        )
      })

      it("should ask to pay and schedule another exam", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = true
        course.has_to_pay = true
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "You did not pass the exam. If you want to re-take the exam, you need to pay again. ",
            action: "course action was called"
          }
        ])
      })

      it("should prompt the user to schedule another exam after certain date", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = false
        course.exams_schedulable_in_future = [
          moment()
            .add(2, "day")
            .format()
        ]

        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "You did not pass the exam. You can sign up to re-take the exam starting " +
              `on ${formatDate(course.exams_schedulable_in_future[0])}.`
          }
        ])
      })

      it("should prompt the user to pay and schedule another exam after certain date", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = false
        course.exams_schedulable_in_future = [
          moment()
            .add(2, "day")
            .format()
        ]
        course.has_to_pay = true
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            action:  "course action was called",
            message:
              "You did not pass the exam. If you want to re-take the exam, you need to pay again. " +
              "You can sign up to re-take the exam starting on " +
              `${formatDate(course.exams_schedulable_in_future[0])}.`
          }
        ])
      })

      // no exam runs to schedule
      it("should ask to check back later if there is no future course run", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "You did not pass the exam. There are currently no exams" +
              " available for scheduling. Please check back later."
          }
        ])
      })

      it("should show un-expanded message", () => {
        // this component returns a react component as its message
        const messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages.length, 2)
        assert.equal(
          messages[0]["message"],
          "There are currently no exams available for scheduling. Please check back later."
        )
        const mounted = shallow(messages[1]["message"])
        assert.equal(
          mounted.text().trim(),
          "If you want to re-take the course you can re-enroll."
        )
        mounted.find("a").simulate("click")
        assert(
          calculateMessagesProps.setShowExpandedCourseStatus.calledWith(
            course.id
          )
        )
      })

      it("should include an expanded message, if the expanded status set includes the course id", () => {
        calculateMessagesProps.expandedStatuses.add(course.id)
        const messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages.length, 3)
        assert.deepEqual(messages[2], {
          message: `Next course starts ${formatDate(
            course.runs[1].course_start_date
          )}.`,
          action: "course action was called"
        })
        assert(
          calculateMessagesProps.courseAction.calledWith(
            course.runs[1],
            COURSE_ACTION_REENROLL
          )
        )
      })
    })

    describe("should prompt users who pass the class and paid to take the exam, if applicable", () => {
      beforeEach(() => {
        makeRunPast(course.runs[0])
        makeRunPassed(course.runs[0])
        makeRunPaid(course.runs[0])
        makeRunFuture(course.runs[1])
        course.has_exam = true
        SETTINGS.FEATURES.ENABLE_EDX_EXAMS = true
      })

      it("should not prompt to take an exam if course has no exams", () => {
        course.runs = [course.runs[0]]
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "There are currently no exams available. Please check back later."
          }
        ])
      })
      it("should prompt the user to take exam if exam coupon available", () => {
        course.runs = [course.runs[0]]
        course.can_schedule_exam = true
        let messages = calculateMessages(calculateMessagesProps).value
        assert.equal(
          messages[0]["message"],
          "There are currently no exams available. Please check back later."
        )
        course.exam_url = "http://example-url.com"
        messages = calculateMessages(calculateMessagesProps).value
        const mounted = shallow(messages[0]["message"])
        assert.equal(
          mounted.text(),
          "You are authorized to take the virtual proctored exam for this " +
            "course. Please enroll now and complete the exam onboarding."
        )
      })
      it("should let the user know when can take exam in the future", () => {
        course.runs = [course.runs[0]]
        course.can_schedule_exam = false
        course.exams_schedulable_in_future = [
          moment()
            .add(2, "day")
            .format()
        ]
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "You can take the exam starting " +
              `on ${formatDate(course.exams_schedulable_in_future[0])}.`
          }
        ])
      })
      it("message for passed exam", () => {
        course.runs = [course.runs[0]]
        course.can_schedule_exam = true
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = true

        let messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages[0]["message"], "You passed this course.")
        assert.equal(messages[1]["message"], "")

        course.exam_url = "http://example.com"
        messages = calculateMessages(calculateMessagesProps).value
        const mounted = shallow(messages[1]["message"])
        assert.equal(
          mounted.text(),
          "You are authorized to take the virtual proctored " +
            "exam for this course. Please enroll now and complete the exam onboarding."
        )
      })
      // Cases with failed exam attempts
      it("should prompt the user to take another exam if there is exam coupon url", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = true

        let messages = calculateMessages(calculateMessagesProps).value
        assert.equal(messages[0]["message"], "You did not pass the exam. ")

        course.exam_url = "http://example.com"
        messages = calculateMessages(calculateMessagesProps).value
        const mounted = shallow(messages[0]["message"])
        assert.equal(
          mounted.text(),
          "You did not pass the exam. You are authorized to take the virtual proctored " +
            "exam for this course. Please enroll now and complete the exam onboarding."
        )
      })
      it("should prompt the user when failed exam", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = false
        assertIsJust(calculateMessages(calculateMessagesProps), [
          { message: "You did not pass the exam. " }
        ])
      })
      it("should prompt the user when failed exam and has to pay", () => {
        course.runs = [course.runs[0]]
        course.proctorate_exams_grades = [makeProctoredExamResult()]
        course.proctorate_exams_grades[0].passed = false
        course.can_schedule_exam = false
        course.has_to_pay = true
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message:
              "You did not pass the exam. If you want to re-take the exam, you need to pay again.",
            action: "course action was called"
          }
        ])
      })
    })

    it("should congratulate the user on passing, exam or no", () => {
      makeRunPast(course.runs[0])
      makeRunPassed(course.runs[0])
      makeRunPaid(course.runs[0])
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: "You passed this course."
        }
      ])
      course.has_exam = true
      course.proctorate_exams_grades = [makeProctoredExamResult()]
      course.proctorate_exams_grades[0].passed = true
      const messages = calculateMessages(calculateMessagesProps).value
      assert.equal(messages.length, 3)
      assert.equal(messages[0]["message"], "You passed this course.")
      assert.equal(
        messages[1]["message"],
        "There are currently no exams available for scheduling. Please check back later."
      )
      let mounted = shallow(messages[2]["message"])
      assert.equal(
        mounted.text().trim(),
        "If you want to re-take the course you can re-enroll."
      )

      course.certificate_url = "certificate_url"
      const [{ message }] = calculateMessages(calculateMessagesProps).value
      mounted = shallow(message)
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
      it(`should nag about missing the payment deadline when future re-enrollments and date is ${
        nextEnrollmentStart[0]
      }`, () => {
        makeRunPast(course.runs[0])
        makeRunMissedDeadline(course.runs[0])
        makeRunOverdue(course.runs[0])
        makeRunFuture(course.runs[1])
        course.runs[1].enrollment_start_date = nextEnrollmentStart[0]
        const date = formatDate(course.runs[1].course_start_date)
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message: `You missed the payment deadline, but you can re-enroll. Next course starts ${date}.${
              nextEnrollmentStart[1]
            }`,
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

    it("should have a message for missing the payment deadline to take an exam", () => {
      course.runs = [course.runs[0]]
      makeRunPast(course.runs[0])
      makeRunMissedDeadline(course.runs[0])
      makeRunOverdue(course.runs[0])

      course.has_exam = true
      course.past_exam_date = "Mar 12 - Mar 22, 2018"

      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You missed the payment deadline to take the proctored exam " +
            `scheduled for ${
              course.past_exam_date
            }. There are no future exams scheduled at this ` +
            "time. Please check back later.",
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

    it("should have a message for missing the payment deadline has future exam", () => {
      course.runs = [course.runs[0]]
      makeRunPast(course.runs[0])
      makeRunMissedDeadline(course.runs[0])
      makeRunOverdue(course.runs[0])

      course.has_exam = true
      course.past_exam_date = "Mar 12 - Mar 22, 2018"
      course.exams_schedulable_in_future = [
        moment()
          .add(2, "day")
          .format()
      ]
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You missed the payment deadline to take the proctored exam " +
            `scheduled for ${
              course.past_exam_date
            }. You can pay now to take the next exam, scheduled for ` +
            `${formatDate(course.exams_schedulable_in_future[0])}.`,
          action: "course action was called"
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

    it("should nag slightly differently if the course has an exam", () => {
      makeRunPast(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      makeRunDueSoon(course.runs[0])
      course.has_exam = true
      const date = moment(course.runs[0].course_upgrade_deadline).format(
        DASHBOARD_FORMAT
      )
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: `The edX course is complete, but you need to pass the exam. (Payment due on ${date})`,
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

    it("should nag slightly differently if the course has an exam with no deadline", () => {
      makeRunPast(course.runs[0])
      makeRunCanUpgrade(course.runs[0])
      course.has_exam = true
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: "The edX course is complete, but you need to pass the exam.",
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

    it("should encourage the user to re-enroll after failing", () => {
      makeRunPast(course.runs[0])
      makeRunFailed(course.runs[0])
      makeRunFuture(course.runs[1])
      course.runs[1].enrollment_start_date = moment()
        .subtract(10, "days")
        .toISOString()
      const date = moment(course.runs[1].course_start_date).format(
        DASHBOARD_FORMAT
      )
      const enrollmentDate = moment(
        course.runs[1].enrollment_start_date
      ).format(DASHBOARD_FORMAT)
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message:
            "You did not pass the edX course, but you can re-enroll." +
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
      it(`should inform next enrollment date after failing edx course when date is ${
        nextEnrollmentStart[0]
      }`, () => {
        makeRunPast(course.runs[0])
        makeRunFailed(course.runs[0])
        makeRunFuture(course.runs[1])
        course.runs[1].enrollment_start_date = nextEnrollmentStart[0]
        const date = moment(course.runs[1].course_start_date).format(
          DASHBOARD_FORMAT
        )
        assertIsJust(calculateMessages(calculateMessagesProps), [
          {
            message: `You did not pass the edX course, but you can re-enroll. Next course starts ${date}.${
              nextEnrollmentStart[1]
            }`,
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
    }

    it("should let the user know they did not pass, when there are no future runs", () => {
      course.runs = course.runs.slice(0, 1)
      makeRunPast(course.runs[0])
      makeRunFailed(course.runs[0])
      assertIsJust(calculateMessages(calculateMessagesProps), [
        {
          message: "You did not pass the edX course."
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

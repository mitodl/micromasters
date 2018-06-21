// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import moment from "moment-timezone"

import type { Coupon } from "../../../flow/couponTypes"
import type {
  Course,
  CourseRun,
  FinancialAidUserInfo
} from "../../../flow/programTypes"
import { makeCouponMessage } from "../../../lib/coupon"
import {
  COUPON_CONTENT_TYPE_COURSE,
  COURSE_ACTION_PAY,
  COURSE_ACTION_REENROLL,
  FA_PENDING_STATUSES,
  FA_TERMINAL_STATUSES,
  STATUS_MISSED_DEADLINE,
  STATUS_PAID_BUT_NOT_ENROLLED,
  STATUS_CAN_UPGRADE,
  COURSE_ACTION_CALCULATE_PRICE,
  DASHBOARD_FORMAT,
  COURSE_DEADLINE_FORMAT
} from "../../../constants"
import { S } from "../../../lib/sanctuary"
import {
  hasPaidForAnyCourseRun,
  courseUpcomingOrCurrent,
  isPassedOrMissedDeadline,
  hasFailedCourseRun,
  futureEnrollableRun,
  isEnrollableRun,
  userIsEnrolled,
  isOfferedInUncertainFuture
} from "./util"
import {
  hasPassingExamGrade,
  hasFailingExamGrade,
  hasPassedCourseRun
} from "../../../lib/grades"

type Message = {
  message: string | React$Element<*>,
  action?: React$Element<*>
}

export const formatAction = (message: Message) => (
  <div className="second-col">{message.action}</div>
)

export const formatMessage = (message: Message, index?: number) => (
  <div className="status-message cols" key={index}>
    <div className="message first-col">{message.message}</div>
    {message.action ? formatAction(message) : null}
  </div>
)

export const formatDate = (date: ?string) =>
  moment(date).format(DASHBOARD_FORMAT)

type CalculateMessagesProps = {
  courseAction: (run: CourseRun, actionType: string) => React$Element<*>,
  financialAid: FinancialAidUserInfo,
  hasFinancialAid: boolean,
  firstRun: CourseRun,
  course: Course,
  expandedStatuses: Set<number>,
  setShowExpandedCourseStatus: (n: number) => void,
  coupon?: Coupon
}

const messageForNotAttemptedExam = (course: Course) => {
  let message =
    "There are currently no exams available for scheduling. Please check back later."

  if (course.can_schedule_exam) {
    message = "Click above to schedule an exam with Pearson."
  } else if (!R.isEmpty(course.exams_schedulable_in_future)) {
    message =
      "You can sign up to take the exam starting on " +
      `on ${formatDate(course.exams_schedulable_in_future[0])}.`
  }
  return message
}

// this calculates any status messages we'll need to show the user
// we wrap the array of messages in a Maybe, so that we can indicate
// the case where there are no messages cleanly
//
// I'm so sorry for anyone who has to read / modify this
// sometimes there really isn't a better way :/
export const calculateMessages = (props: CalculateMessagesProps) => {
  const {
    coupon,
    courseAction,
    financialAid,
    hasFinancialAid,
    firstRun,
    course,
    expandedStatuses,
    setShowExpandedCourseStatus
  } = props

  const exams = course.has_exam
  const paid = firstRun.has_paid
  const passedExam = hasPassingExamGrade(course)
  const failedExam = hasFailingExamGrade(course)
  const paymentDueDate = moment(
    R.defaultTo("", firstRun.course_upgrade_deadline)
  )
  if (firstRun.status === STATUS_PAID_BUT_NOT_ENROLLED && !hasFinancialAid) {
    const contactHref = `mailto:${SETTINGS.support_email}`
    return S.Just([
      {
        message: (
          <div>
            {
              "Something went wrong. You paid for this course but are not enrolled. "
            }
            <a href={contactHref}>Contact us for help.</a>
          </div>
        )
      }
    ])
  }

  // Course run isn't enrollable, user never enrolled
  if (!isEnrollableRun(firstRun) && !R.any(userIsEnrolled, course.runs)) {
    if (firstRun.fuzzy_start_date && isOfferedInUncertainFuture(firstRun)) {
      return S.Just([
        {
          message: `Course starts ${firstRun.fuzzy_start_date}.`
        }
      ])
    } else {
      return S.Just([
        {
          message: "There are no future course runs scheduled."
        }
      ])
    }
  }

  const messages = []

  if (course.certificate_url) {
    messages.push({
      message: (
        <div>
          {"You passed this course! "}
          <a
            href={course.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Certificate
          </a>
          {S.maybe(
            null,
            () => [
              <span key="first">{" | "}</span>,
              <a
                key="second"
                onClick={() => setShowExpandedCourseStatus(course.id)}
              >
                Re-enroll
              </a>
            ],
            futureEnrollableRun(course)
          )}
        </div>
      )
    })
  }
  // Course is running, user has already paid,
  if (courseUpcomingOrCurrent(firstRun) && paid && userIsEnrolled(firstRun)) {
    if (exams) {
      messages.push({
        message: messageForNotAttemptedExam(course)
      })
    }
    return S.Just(messages)
  }

  if (
    coupon &&
    coupon.content_type === COUPON_CONTENT_TYPE_COURSE &&
    coupon.object_id === course.id
  ) {
    messages.push({ message: makeCouponMessage(coupon) })
  }

  // handle other 'in-progress' cases
  if (firstRun.status === STATUS_CAN_UPGRADE) {
    let message =
      "You are auditing. To get credit, you need to pay for the course."
    if (course.certificate_url) {
      message =
        "You are re-taking this course. To get a new grade, you need to pay again."
    }
    let actionType = COURSE_ACTION_PAY
    if (hasFinancialAid) {
      if (FA_PENDING_STATUSES.includes(financialAid.application_status)) {
        message =
          "You are auditing. Your personal course price is pending, " +
          "and needs to be approved before you can pay for courses."
      } else if (
        !FA_TERMINAL_STATUSES.includes(financialAid.application_status)
      ) {
        actionType = COURSE_ACTION_CALCULATE_PRICE
      }
    }

    let paymentDueMessage = ""
    if (paymentDueDate.isValid()) {
      paymentDueMessage = ` (Payment due on ${paymentDueDate
        .tz(moment.tz.guess())
        .format(COURSE_DEADLINE_FORMAT)})`
    }
    messages.push({
      message: message + paymentDueMessage,
      action:  courseAction(firstRun, actionType)
    })
    return S.Just(messages)
  }

  // all cases where courseRun is not currently in progress
  // first, all cases where the user has already passed the course
  if (isPassedOrMissedDeadline(firstRun)) {
    // paid statuses
    if (hasPaidForAnyCourseRun(course)) {
      // exam is required, user has not yet passed it
      if (exams && !passedExam) {
        let messageBox = {}
        if (failedExam) {
          if (course.can_schedule_exam) {
            // if can schedule exam now
            if (course.has_to_pay) {
              messageBox = {
                message:
                  "You did not pass the exam. If you want to re-take the exam, you need to pay again.",
                action: courseAction(firstRun, COURSE_ACTION_PAY)
              }
            } else {
              messageBox["message"] =
                "You did not pass the exam, but you can try again. " +
                "Click above to reschedule an exam with Pearson."
            }
          } else if (R.isEmpty(course.exams_schedulable_in_future)) {
            // no info about future exam runs
            messageBox["message"] =
              "You did not pass the exam. There are currently no exams " +
              "available for scheduling. Please check back later."
          } else {
            // can not schedule now, but some time in the future
            if (course.has_to_pay) {
              messageBox = {
                message:
                  "You did not pass the exam. If you want to re-take the exam, you need " +
                  "to pay again. You can sign up to re-take the exam starting " +
                  `on ${formatDate(course.exams_schedulable_in_future[0])}`,
                action: courseAction(firstRun, COURSE_ACTION_PAY)
              }
            } else {
              messageBox["message"] =
                "You did not pass the exam, but you can try again. " +
                "You can sign up to re-take the exam starting on " +
                `on ${formatDate(course.exams_schedulable_in_future[0])}.`
            }
          }
        } else {
          // no past exam attempts
          messageBox["message"] =
            "The edX course is complete, but you need to pass the final exam."
        }
        messages.push(messageBox)

        if (S.isJust(futureEnrollableRun(course))) {
          messages.push({
            message: (
              <span>
                {"If you want to re-take the course you can "}
                <a onClick={() => setShowExpandedCourseStatus(course.id)}>
                  re-enroll.
                </a>
              </span>
            )
          })
        }
      } else if (!course.certificate_url) {
        messages.push({
          message: "You passed this course."
        })
      }

      // this is the expanded message, which we should show if the user
      // has clicked one of the 're-enroll' links
      if (expandedStatuses.has(course.id)) {
        messages.push(
          S.maybe(
            null,
            run => ({
              message: `Next course starts ${formatDate(
                run.course_start_date
              )}.`,
              action: courseAction(run, COURSE_ACTION_REENROLL)
            }),
            futureEnrollableRun(course)
          )
        )
      }
      return S.Just(messages)
    } else {
      // user missed the payment due date
      if (
        firstRun.status === STATUS_MISSED_DEADLINE ||
        paymentDueDate.isBefore(moment())
      ) {
        const date = run => formatDate(run.course_start_date)
        const msg = run => {
          let enrollmentDateMessage = ""
          if (
            !R.isNil(run.enrollment_start_date) &&
            !R.isEmpty(run.enrollment_start_date) &&
            !isEnrollableRun(run)
          ) {
            enrollmentDateMessage = ` Enrollment starts ${formatDate(
              run.enrollment_start_date
            )}`
          }
          return `You missed the payment deadline, but you can re-enroll. Next course starts ${date(
            run
          )}.${enrollmentDateMessage}`
        }
        messages.push(
          S.maybe(
            {
              message:
                "You missed the payment deadline and will not receive MicroMasters credit for this course. " +
                "There are no future runs of this course scheduled at this time."
            },
            run => ({
              message: msg(run),
              action:  courseAction(run, COURSE_ACTION_REENROLL)
            }),
            futureEnrollableRun(course)
          )
        )
      } else {
        const dueDate = paymentDueDate.isValid()
          ? ` (Payment due on ${paymentDueDate.format(DASHBOARD_FORMAT)})`
          : ""
        if (exams) {
          messages.push({
            message: `The edX course is complete, but you need to pass the exam.${dueDate}`,
            action:  courseAction(firstRun, COURSE_ACTION_PAY)
          })
        } else {
          messages.push({
            message: `The edX course is complete, but you need to pay to get credit.${dueDate}`,
            action:  courseAction(firstRun, COURSE_ACTION_PAY)
          })
        }
        return S.Just(messages)
      }
    }
  } else {
    if (hasFailedCourseRun(course) && !hasPassedCourseRun(course)) {
      const msg = run => {
        let enrollmentDateMessage = ""
        let courseStartMessage = ""
        if (
          !R.isNil(run.enrollment_start_date) &&
          !R.isEmpty(run.enrollment_start_date)
        ) {
          const startText = isEnrollableRun(run) ? "started" : "starts"
          enrollmentDateMessage = ` Enrollment ${startText} ${formatDate(
            run.enrollment_start_date
          )}.`
        } else if (run.fuzzy_enrollment_start_date) {
          enrollmentDateMessage = `Enrollment starts ${run.fuzzy_enrollment_start_date}.`
        }
        if (run.course_start_date) {
          courseStartMessage = `Next course starts ${formatDate(
            run.course_start_date
          )}.`
        } else if (run.fuzzy_start_date) {
          courseStartMessage = `Next course starts ${run.fuzzy_start_date}.`
        }
        return `You did not pass the edX course, but you can re-enroll. ${courseStartMessage}${enrollmentDateMessage}`
      }
      return S.Just(
        S.maybe(
          messages.concat({ message: "You did not pass the edX course." }),
          run =>
            messages.concat({
              message: msg(run),
              action:  courseAction(run, COURSE_ACTION_REENROLL)
            }),
          futureEnrollableRun(course)
        )
      )
    }
  }
  return messages.length === 0 ? S.Nothing : S.Just(messages)
}

const formatMessages = R.addIndex(R.map)(formatMessage)

const wrapMessages = messages => (
  <div className="course-status-messages">{messages}</div>
)

const StatusMessages = R.compose(
  S.maybe(null, wrapMessages),
  S.map(formatMessages),
  calculateMessages
)

export default StatusMessages

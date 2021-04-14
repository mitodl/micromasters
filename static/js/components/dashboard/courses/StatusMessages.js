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
  STATUS_PAID_BUT_NOT_ENROLLED,
  STATUS_CAN_UPGRADE,
  COURSE_ACTION_CALCULATE_PRICE,
  DASHBOARD_FORMAT,
  COURSE_DEADLINE_FORMAT,
  STATUS_CURRENTLY_ENROLLED,
  COURSE_ACTION_ENROLL,
  EDX_LINK_BASE
} from "../../../constants"
import { S } from "../../../lib/sanctuary"
import {
  courseUpcomingOrCurrent,
  hasFailedCourseRun,
  futureEnrollableRun,
  isEnrollableRun,
  userIsEnrolled,
  isOfferedInUncertainFuture,
  notNilorEmpty,
  hasCanUpgradeCourseRun,
  hasMissedDeadlineCourseRun,
  hasCurrentlyEnrolledCourseRun
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
  setExamEnrollmentDialogVisibility: (b: boolean) => void,
  setSelectedExamCouponCourse: (n: number) => void,
  coupon?: Coupon
}

const courseStartMessage = (run: CourseRun) => {
  const startDate = notNilorEmpty(run.course_start_date)
    ? formatDate(run.course_start_date)
    : run.fuzzy_start_date
  if (startDate) {
    return `Next course starts ${startDate}.`
  }
  return ""
}

const enrollmentDateMessage = (run: CourseRun) => {
  const enrollmentDate = notNilorEmpty(run.enrollment_start_date)
    ? formatDate(run.enrollment_start_date)
    : run.fuzzy_enrollment_start_date
  if (enrollmentDate) {
    const startText = isEnrollableRun(run) ? "started" : "starts"
    return ` Enrollment ${startText} ${enrollmentDate}.`
  }
  return ""
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
    setShowExpandedCourseStatus,
    setSelectedExamCouponCourse,
    setExamEnrollmentDialogVisibility
  } = props

  const exams = course.has_exam
  const paid = firstRun.has_paid
  const passedExam = hasPassingExamGrade(course)
  const failedExam = hasFailingExamGrade(course)
  const paymentDueDate = moment(
    R.defaultTo("", firstRun.course_upgrade_deadline)
  )

  const messages = []

  // If first run is paid but user never enrolled, most likely there was
  // problem enrolling, and first_unexpired_run is returned, so no need to check for past enrollment
  if (firstRun.status === STATUS_PAID_BUT_NOT_ENROLLED) {
    const contactHref = `mailto:${SETTINGS.support_email}`
    let date = ""
    if (isEnrollableRun(firstRun)) {
      date = `now`
    } else if (notNilorEmpty(firstRun.enrollment_start_date)) {
      date = formatDate(firstRun.enrollment_start_date)
    } else if (
      firstRun.fuzzy_start_date &&
      isOfferedInUncertainFuture(firstRun)
    ) {
      date = `in ${firstRun.fuzzy_start_date}`
    }
    return S.Just([
      {
        message: (
          <div>
            {`You paid for this course but are not enrolled. You can enroll ${date}, or if` +
              " you think there is a problem, "}
            <a href={contactHref}>contact us for help.</a>
          </div>
        ),
        action: courseAction(firstRun, COURSE_ACTION_ENROLL)
      }
    ])
  }

  if (
    coupon &&
    coupon.content_type === COUPON_CONTENT_TYPE_COURSE &&
    coupon.object_id === course.id
  ) {
    messages.push({ message: makeCouponMessage(coupon) })
  }

  // User never enrolled
  if (!R.any(userIsEnrolled, course.runs)) {
    if (isEnrollableRun(firstRun)) {
      messages.push({
        message: `${courseStartMessage(firstRun)}`,
        action:  courseAction(firstRun, COURSE_ACTION_ENROLL)
      })
    } else if (
      firstRun.fuzzy_start_date &&
      isOfferedInUncertainFuture(firstRun)
    ) {
      messages.push({
        message: `${courseStartMessage(firstRun)}`
      })
    } else {
      messages.push({
        message: "There are no future course runs scheduled."
      })
    }
  }

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
  // course is passed and paid but no certificate yet
  if (firstRun["status"] === "passed" && paid && !course.certificate_url) {
    if (!exams || (exams && passedExam)) {
      messages.push({
        message: "You passed this course."
      })
    }
  }
  // Course is running, user has already paid,
  if (
    courseUpcomingOrCurrent(firstRun) &&
    paid &&
    userIsEnrolled(firstRun) &&
    !exams
  ) {
    return S.Just(messages)
  }

  // handle other 'in-progress' cases
  if (
    firstRun.status === STATUS_CAN_UPGRADE &&
    courseUpcomingOrCurrent(firstRun)
  ) {
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

  // Exam messages only
  if (
    (hasPassedCourseRun(course) || hasCurrentlyEnrolledCourseRun(course)) &&
    exams &&
    paid
  ) {
    let message =
      "There are currently no exams available. Please check back later."
    let passedMsg = ""
    if (passedExam || failedExam) {
      passedMsg = passedExam
        ? "You passed the exam."
        : "You did not pass the exam."
      if (course.has_to_pay && course.can_schedule_exam) {
        passedMsg = `${passedMsg} If you want to re-take the exam, you need to pay again.`
      }
      message = passedMsg
    }
    if (course.can_schedule_exam && course.exam_url) {
      message = (
        <span>
          {`${passedMsg} You are authorized to take the virtual proctored exam for this course. Please `}
          <a
            onClick={() => {
              setSelectedExamCouponCourse(course.id)
              setExamEnrollmentDialogVisibility(true)
            }}
          >
            register now and complete the exam onboarding.
          </a>
          {` You must register by ${
            course.exam_register_end_date
          } to be eligible to take the exam between ${
            course.current_exam_dates
          }.`}
          <br />
          <br />
          If you have already registered for the exam, you can access the exam
          through your <a href={EDX_LINK_BASE}>edX dashboard</a>.
        </span>
      )
    } else if (!R.isEmpty(course.exams_schedulable_in_future)) {
      message =
        `${passedMsg} You can register to take the exam starting ` +
        `on ${formatDate(course.exams_schedulable_in_future[0])}.`
    }

    if (course.has_to_pay) {
      messages.push({
        message: message,
        action:  courseAction(firstRun, COURSE_ACTION_PAY)
      })
    } else {
      messages.push({ message: message })
    }

    if (
      firstRun["status"] !== STATUS_CURRENTLY_ENROLLED &&
      S.isJust(futureEnrollableRun(course))
    ) {
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
  }
  // all cases where courseRun is not currently in progress
  // passed means user also paid
  if (hasPassedCourseRun(course)) {
    // this is the expanded message, which we should show if the user
    // has clicked one of the 're-enroll' links
    if (expandedStatuses.has(course.id)) {
      messages.push(
        S.maybe(
          null,
          run => ({
            message: `Next course starts ${formatDate(run.course_start_date)}.`,
            action:  courseAction(run, COURSE_ACTION_REENROLL)
          }),
          futureEnrollableRun(course)
        )
      )
    }
    return S.Just(messages)
  } else if (hasCanUpgradeCourseRun(course)) {
    // the course finished but can still pay
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
  } else if (hasMissedDeadlineCourseRun(course)) {
    // the course finished can't pay
    if (exams) {
      const futureExamMessage = R.isEmpty(course.exam_date_next_semester)
        ? " There are no future exams scheduled at this time. Please check back later."
        : ` You can pay now to take the next exam, scheduled for ${
          course.exam_date_next_semester
        }.`

      messages.push({
        message:
          "You missed the payment deadline to take the proctored exam this term." +
          `${futureExamMessage}`,
        action: courseAction(firstRun, COURSE_ACTION_PAY)
      })
    } else {
      const date = run => formatDate(run.course_start_date)
      const msg = run => {
        return `You missed the payment deadline, but you can re-enroll. Next course starts ${date(
          run
        )}.${enrollmentDateMessage(run)}`
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
    }
  }
  if (hasFailedCourseRun(course) && !hasPassedCourseRun(course)) {
    return S.Just(
      S.maybe(
        messages.concat({ message: "You did not pass the edX course." }),
        run =>
          messages.concat({
            message: `You did not pass the edX course, but you can re-enroll. ${courseStartMessage(
              run
            )}${enrollmentDateMessage(run)}`,
            action: courseAction(run, COURSE_ACTION_REENROLL)
          }),
        futureEnrollableRun(course)
      )
    )
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

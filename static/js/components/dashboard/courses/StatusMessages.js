// @flow
/* global SETTINGS: false */
import React from 'react';
import R from 'ramda';
import moment from 'moment';

import type { Coupon } from '../../../flow/couponTypes';
import type { Course, CourseRun } from '../../../flow/programTypes';
import { makeCouponMessage } from '../../../lib/coupon';
import {
  COUPON_CONTENT_TYPE_COURSE,
  COURSE_ACTION_PAY,
  COURSE_ACTION_REENROLL,
  STATUS_MISSED_DEADLINE,
  STATUS_PAID_BUT_NOT_ENROLLED,
  STATUS_CAN_UPGRADE,
} from '../../../constants';
import { S } from '../../../lib/sanctuary';
import {
  hasPaidForAnyCourseRun,
  courseUpcomingOrCurrent,
  isPassedOrMissedDeadline,
  hasFailedCourseRun,
  futureEnrollableRun,
  isEnrollableRun,
  userIsEnrolled,
} from './util';
import { hasPassingExamGrade, hasFailingExamGrade, hasPassedCourseRun } from '../../../lib/grades';
import { COURSE_CARD_FORMAT } from '../../../constants';

type Message = {
  message: string|React$Element<*>,
  action?: React$Element<*>
};

export const formatAction = (message: Message) => (
  <div className="second-col">
    { message.action }
  </div>
);

export const formatMessage = (message: Message, index?: number) => (
  <div className="status-message cols" key={index}>
    <div className="message first-col">
      { message.message }
    </div>
    { message.action ? formatAction(message) : null }
  </div>
);

export const formatDate = (date: ?string) => (
  moment(date).format(COURSE_CARD_FORMAT)
);

type CalculateMessagesProps = {
  courseAction:                (run: CourseRun, actionType: string) => React$Element<*>,
  firstRun:                    CourseRun,
  course:                      Course,
  expandedStatuses:            Set<number>,
  setShowExpandedCourseStatus: (n: number) => void,
  coupon?:                     Coupon,
};

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
    firstRun,
    course,
    expandedStatuses,
    setShowExpandedCourseStatus,
  } = props;

  let exams = course.has_exam;
  let paid = firstRun.has_paid;
  let passedExam = hasPassingExamGrade(course);
  let failedExam = hasFailingExamGrade(course);
  let paymentDueDate = moment(firstRun.course_upgrade_deadline);

  if (firstRun.status === STATUS_PAID_BUT_NOT_ENROLLED) {
    const contactHref = `mailto:${SETTINGS.support_email}`;
    return S.Just([{
      message: <div>
        {"Something went wrong. You paid for this course but are not enrolled. "}
        <a href={contactHref}>
          Contact us for help.
        </a>
      </div>
    }]);
  }

  // Course run isn't enrollable, user never enrolled
  if (!isEnrollableRun(firstRun) && !R.any(userIsEnrolled, course.runs)) {
    return S.Just([{
      message: "There are no future course runs scheduled."
    }]);
  }

  // Course is running, user has already paid, we show no messages
  if (courseUpcomingOrCurrent(firstRun) && paid) {
    return S.Nothing;
  }

  let messages = [];


  if (coupon && coupon.content_type === COUPON_CONTENT_TYPE_COURSE && coupon.object_id === course.id) {
    messages.push({ message: makeCouponMessage(coupon)});
  }

  // handle other 'in-progress' cases
  if (courseUpcomingOrCurrent(firstRun) || firstRun.status === STATUS_CAN_UPGRADE) {
    if (hasPaidForAnyCourseRun(course)) {
      messages.push({message: "You are auditing this course."});
    } else {
      messages.push({
        message: "You are auditing. To get credit, you need to pay for the course.",
        action: courseAction(firstRun, COURSE_ACTION_PAY)
      });
    }
    return S.Just(messages);
  }

  // all cases where courseRun is not currently in progress
  // first, all cases where the user has already passed the course
  if (isPassedOrMissedDeadline(firstRun)) {
    // paid statuses
    if (hasPaidForAnyCourseRun(course)) {
      // exam is required, user has not yet passed it
      if (exams && ! passedExam) {
        let messageBox = {};
        if (failedExam) {
          if (course.can_schedule_exam) { // if can schedule exam now
            if (course.has_to_pay) {
              messageBox = {
                message: "You did not pass the exam. If you want to re-take the exam, you need to pay again.",
                action: courseAction(firstRun, COURSE_ACTION_PAY)
              };
            } else {
              messageBox['message'] = "You did not pass the exam, but you can try again. " +
                "Click above to reschedule an exam with Pearson.";
            }
          } else if (R.isEmpty(course.exams_schedulable_in_future)) {
            // no info about future exam runs
            messageBox['message'] = "You did not pass the exam. There are currently no exams " +
             "available for scheduling. Please check back later.";
          } else {
            // can not schedule now, but some time in the future
            if (course.has_to_pay) {
              messageBox = {
                message: "You did not pass the exam. If you want to re-take the exam, you need " +
                "to pay again. You can sign up to re-take the exam starting " +
                `on ${formatDate(course.exams_schedulable_in_future[0])}`,
                action: courseAction(firstRun, COURSE_ACTION_PAY)
              };
            } else {
              messageBox['message'] = "You did not pass the exam, but you can try again. " +
                "You can sign up to re-take the exam starting on " +
                `on ${formatDate(course.exams_schedulable_in_future[0])}.`;
            }
          }
        } else { // no past exam attempts
          messageBox['message'] = "The edX course is complete, but you need to pass the final exam.";
        }
        messages.push(S.maybe(
          messageBox,
          () => ({
            message: <span>
              The edX course is complete, but you need to pass the final exam.
              {" If you want to re-take the course you can "}
              <a onClick={() => setShowExpandedCourseStatus(course.id)}>
                re-enroll.
              </a>
            </span>
          }), futureEnrollableRun(course))
        );

        // this is the expanded message, which we should if the user clicks the link above
        if (expandedStatuses.has(course.id)) {
          messages.push(S.maybe(null, run => ({
            message: `Next course starts ${formatDate(run.course_start_date)}.`,
            action: courseAction(run, COURSE_ACTION_REENROLL),
          }), futureEnrollableRun(course)));
        }

      } else {
        messages.push({
          // TODO add links
          message: "You passed this course."
        });
      }
      return S.Just(messages);
    } else {
      // user missed the payment due date
      if (firstRun.status === STATUS_MISSED_DEADLINE || paymentDueDate.isBefore(moment())) {
        let date = run => formatDate(run.course_start_date);
        let msg = run => `You missed the payment deadline, but you can re-enroll. Next course starts ${date(run)}`;
        messages.push(S.maybe({
          message: "You missed the payment deadline and will not receive MicroMasters credit for this course. " +
          "There are no future runs of this course scheduled at this time."
        }, run => ({
          message: msg(run),
          action: courseAction(run, COURSE_ACTION_REENROLL)
        }), futureEnrollableRun(course)));
      } else {
        let dueDate = paymentDueDate.format(COURSE_CARD_FORMAT);
        if (exams) {
          messages.push({
            message: `The edX course is complete, but you need to pass the exam. (Payment due on ${dueDate})`,
            action: courseAction(firstRun, COURSE_ACTION_PAY)
          });
        } else {
          messages.push({
            message: `The edX course is complete, but you need to pay to get credit. (Payment due on ${dueDate})`,
            action: courseAction(firstRun, COURSE_ACTION_PAY)
          });
        }
        return S.Just(messages);
      }
    }
  } else {
    if (hasFailedCourseRun(course) && !hasPassedCourseRun(course)) {
      let date = run => formatDate(run.course_start_date);
      return S.Just(S.maybe(
        messages.concat({ message: "You did not pass the edX course." }),
        run => messages.concat({
          message: `You did not pass the edX course, but you can re-enroll. Next course starts ${date(run)}.`,
          action: courseAction(run, COURSE_ACTION_REENROLL),
        }),
        futureEnrollableRun(course)
      ));
    }
  }
  return messages.length === 0 ? S.Nothing : S.Just(messages);
};

const formatMessages = R.addIndex(R.map)(formatMessage);

const wrapMessages = messages => (
  <div className="course-status-messages">
    { messages }
  </div>
);

const StatusMessages = R.compose(
  S.maybe(null, wrapMessages),
  S.map(formatMessages),
  calculateMessages,
);

export default StatusMessages;

// @flow
/* global SETTINGS: false */
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';

import {
  formatAction,
  formatMessage,
  formatDate,
  calculateMessages,
} from './StatusMessages';
import {
  makeCourse,
  makeProctoredExamResult,
  makeProgram,
  makeCoupon,
} from '../../../factories/dashboard';
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
} from './test_util';
import { assertIsJust, assertIsNothing } from '../../../lib/test_utils';
import {
  COURSE_ACTION_PAY,
  COURSE_ACTION_REENROLL,
  COUPON_CONTENT_TYPE_COURSE,
  COURSE_CARD_FORMAT,
  STATUS_PAID_BUT_NOT_ENROLLED,
} from '../../../constants';
import * as libCoupon from '../../../lib/coupon';

describe('Course Status Messages', () => {
  let message;

  beforeEach(() => {
    message = {
      message: <div>TEST MESSAGE</div>
    };
  });

  describe('formatMessage', () => {
    it('should format a basic message', () => {
      let renderedMessage = shallow(formatMessage(message));
      assert.equal(renderedMessage.props().className, 'status-message cols');
      assert.equal(renderedMessage.find('.message.first-col').text(), 'TEST MESSAGE');
    });

    it('should format a message with an action', () => {
      let msg = { action: <button>button!</button>, ...message};
      let renderedMessage = shallow(formatMessage(msg));
      assert.equal(renderedMessage.find('.second-col button').length, 1);
    });
  });

  describe('formatAction', () => {
    it('should just wrap an action in a div', () => {
      let action = shallow(
        formatAction({ action: <button>button!</button>, message: "test" })

      );
      assert.equal(action.type(), 'div');
      assert.equal(action.props().className, 'second-col');
      assert.equal(action.find('button').length, 1);
    });
  });

  describe('calculateMessages', () => {
    let course, sandbox, calculateMessagesProps;

    beforeEach(() => {
      course = makeCourse(0);
      sandbox = sinon.sandbox.create();
      calculateMessagesProps = {
        courseAction:                sandbox.stub(),
        firstRun:                    course.runs[0],
        course:                      course,
        expandedStatuses:            new Set,
        setShowExpandedCourseStatus: sandbox.stub(),
        coupon:                      undefined,
      };
      calculateMessagesProps.courseAction.returns('course action was called');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should have a message for STATUS_PAID_BUT_NOT_ENROLLED', () => {
      course.runs[0].status = STATUS_PAID_BUT_NOT_ENROLLED;
      let [{ message }] = calculateMessages(calculateMessagesProps).value;
      let mounted = shallow(message);
      assert.equal(
        mounted.text(), 
        "Something went wrong. You paid for this course but are not enrolled. Contact us for help."
      );
      assert.equal(
        mounted.find('a').props().href,
        `mailto:${SETTINGS.support_email}`
      );
    });

    it('should include information about a course coupon', () => {
      let makeAmountMessageStub = sandbox
        .stub(libCoupon, 'makeAmountMessage')
        .returns('all of the money');
      let makeCouponTargetMessageStub = sandbox
        .stub(libCoupon, 'makeCouponReason')
        .returns(', because why not');
      let program = makeProgram();
      let coupon = makeCoupon(program);
      coupon.content_type = COUPON_CONTENT_TYPE_COURSE;
      coupon.object_id = program.courses[0].id;
      calculateMessagesProps.course = program.courses[0];
      makeRunCurrent(calculateMessagesProps.course.runs[0]);
      makeRunEnrolled(calculateMessagesProps.course.runs[0]);
      calculateMessagesProps.coupon = coupon;
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        "message": "You will get all of the money off the cost for this course, because why not."
      }]);
      assert.isTrue(makeAmountMessageStub.calledWith(coupon));
      assert.isTrue(makeCouponTargetMessageStub.calledWith(coupon));
    });

    it('should return Nothing if the user paid and the course is running', () => {
      makeRunCurrent(course.runs[0]);
      makeRunPaid(course.runs[0]);
      makeRunEnrolled(course.runs[0]);
      assertIsNothing(calculateMessages(calculateMessagesProps));
    });

    it('should nag unpaid auditors to pay', () => {
      makeRunCurrent(course.runs[0]);
      makeRunEnrolled(course.runs[0]);
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        "action": "course action was called",
        "message": "You are auditing. To get credit, you need to pay for the course."
      }]);
      assert(calculateMessagesProps.courseAction.calledWith(
        course.runs[0],
        COURSE_ACTION_PAY
      ));
    });

    describe('should prompt users who pass the class to take the exam, if applicable', () => {
      beforeEach(() => {
        makeRunPast(course.runs[0]);
        makeRunPassed(course.runs[0]);
        makeRunPaid(course.runs[0]);
        makeRunFuture(course.runs[1]);
        course.has_exam = true;
      });

      it('should not prompt to re-enroll if there is no future course run', () => {
        course.runs = [course.runs[0]];
        assertIsJust(calculateMessages(calculateMessagesProps), [{
          message: "The edX course is complete, but you need to pass the final exam."
        }]);
      });
      // Cases with failed exam attempts
      it('should prompt the user to schedule another exam', () => {
        course.runs = [course.runs[0]];
        course.proctorate_exams_grades = [ makeProctoredExamResult() ];
        course.proctorate_exams_grades[0].passed = false;
        course.can_schedule_exam = true;
        assertIsJust(calculateMessages(calculateMessagesProps), [{
          message: "You did not pass the exam, but you can try again." +
          " Click above to reschedule an exam with Pearson."
        }]);
      });

      it('should ask to pay and schedule another exam', () => {
        course.runs = [course.runs[0]];
        course.proctorate_exams_grades = [ makeProctoredExamResult() ];
        course.proctorate_exams_grades[0].passed = false;
        course.can_schedule_exam = true;
        course.has_to_pay = true;
        assertIsJust(calculateMessages(calculateMessagesProps), [{
          message: "You did not pass the exam. If you want to re-take the exam, you need to pay again.",
          action: 'course action was called'
        }]);
      });

      it('should prompt the user to schedule another exam after certain date', () => {
        course.runs = [course.runs[0]];
        course.proctorate_exams_grades = [ makeProctoredExamResult() ];
        course.proctorate_exams_grades[0].passed = false;
        course.can_schedule_exam = false;
        course.exams_schedulable_in_future = [moment().add(2, 'day').format()];

        assertIsJust(calculateMessages(calculateMessagesProps), [{
          message: "You did not pass the exam, but you can try again. " +
                "You can sign up to re-take the exam starting on " +
                `on ${formatDate(course.exams_schedulable_in_future[0])}.`
        }]);
      });

      it('should prompt the user to pay and schedule another exam after certain date', () => {
        course.runs = [course.runs[0]];
        course.proctorate_exams_grades = [ makeProctoredExamResult() ];
        course.proctorate_exams_grades[0].passed = false;
        course.can_schedule_exam = false;
        course.exams_schedulable_in_future = [moment().add(2, 'day').format()];
        course.has_to_pay = true;
        assertIsJust(calculateMessages(calculateMessagesProps), [{
          message: "You did not pass the exam. If you want to re-take the exam, you need to pay again. " +
          "You can sign up to re-take the exam starting on " +
          `${formatDate(course.exams_schedulable_in_future[0])}`,
          action: 'course action was called'
        }]);
      });
      // no exam runs to schedule
      it('should ask to check back later if there is no future course run', () => {
        course.runs = [course.runs[0]];
        course.proctorate_exams_grades = [ makeProctoredExamResult() ];
        course.proctorate_exams_grades[0].passed = false;
        assertIsJust(calculateMessages(calculateMessagesProps), [{
          message: "You did not pass the exam. There are currently no exams" +
          " available for scheduling. Please check back later."
        }]);
      });

      it('should show un-expanded message', () => {
        // this component returns a react component as its message
        let [{ message }] = calculateMessages(calculateMessagesProps).value;
        let mounted = shallow(message);
        assert.equal(mounted.text().trim(),
          "The edX course is complete, but you need to pass the final exam. " +
          "If you want to re-take the course you can re-enroll."
        );
        mounted.find('a').simulate('click');
        assert(calculateMessagesProps.setShowExpandedCourseStatus.calledWith(course.id));
      });

      it('should include an expanded message, if the expanded status set includes the course id', () => {
        calculateMessagesProps.expandedStatuses.add(course.id);
        let messages = calculateMessages(calculateMessagesProps).value;
        assert.equal(messages.length, 2);
        assert.deepEqual(messages[1], {
          message: `Next course starts ${formatDate(course.runs[1].course_start_date)}.`,
          action: 'course action was called'
        });
        assert(calculateMessagesProps.courseAction.calledWith(
          course.runs[1],
          COURSE_ACTION_REENROLL
        ));
      });
    });

    it('should congradulate the user on passing, exam or no', () => {
      makeRunPast(course.runs[0]);
      makeRunPassed(course.runs[0]);
      makeRunPaid(course.runs[0]);
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: "You passed this course."
      }]);
      course.has_exam = true;
      course.proctorate_exams_grades = [ makeProctoredExamResult() ];
      course.proctorate_exams_grades[0].passed = true;
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: "You passed this course."
      }]);
    });

    it('should nag about missing the payment deadline', () => {
      makeRunPast(course.runs[0]);
      makeRunPassed(course.runs[0]);
      makeRunOverdue(course.runs[0]);
      makeRunFuture(course.runs[1]);
      let date = formatDate(course.runs[1].course_start_date);
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: `You missed the payment deadline, but you can re-enroll. Next course starts ${date}`,
        action: "course action was called"
      }]);
      assert(calculateMessagesProps.courseAction.calledWith(
        course.runs[1],
        COURSE_ACTION_REENROLL
      ));
    });

    it('should have a message for missing the payment deadline with no future courses', () => {
      course.runs = [course.runs[0]];
      makeRunPast(course.runs[0]);
      makeRunPassed(course.runs[0]);
      makeRunOverdue(course.runs[0]);
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: "You missed the payment deadline and will not receive MicroMasters credit for this course. " +
        "There are no future runs of this course scheduled at this time."
      }]);
    });

    it('should nag about paying after the edx course is complete', () => {
      makeRunPast(course.runs[0]);
      makeRunPassed(course.runs[0]);
      makeRunDueSoon(course.runs[0]);
      let date = moment(course.runs[0].course_upgrade_deadline).format(COURSE_CARD_FORMAT);
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: `The edX course is complete, but you need to pay to get credit. (Payment due on ${date})`,
        action: "course action was called"
      }]);
      assert(calculateMessagesProps.courseAction.calledWith(
        course.runs[0],
        COURSE_ACTION_PAY,
      ));
    });

    it('should nag slightly differently if the course has an exam', () => {
      makeRunPast(course.runs[0]);
      makeRunPassed(course.runs[0]);
      makeRunDueSoon(course.runs[0]);
      course.has_exam = true;
      let date = moment(course.runs[0].course_upgrade_deadline).format(COURSE_CARD_FORMAT);
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: `The edX course is complete, but you need to pass the exam. (Payment due on ${date})`,
        action: "course action was called"
      }]);
      assert(calculateMessagesProps.courseAction.calledWith(
        course.runs[0],
        COURSE_ACTION_PAY,
      ));
    });

    it('should encourage the user to re-enroll after failing', () => {
      makeRunPast(course.runs[0]);
      makeRunFailed(course.runs[0]);
      makeRunFuture(course.runs[1]);
      let date = moment(course.runs[1].course_start_date).format('MM/DD/YYYY');
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: `You did not pass the edX course, but you can re-enroll. Next course starts ${date}.`,
        action: "course action was called"
      }]);
      assert(calculateMessagesProps.courseAction.calledWith(
        course.runs[1],
        COURSE_ACTION_REENROLL
      ));
    });

    it('should let the user know they did not pass, when there are no future runs', () => {
      course.runs = course.runs.slice(0,1);
      makeRunPast(course.runs[0]);
      makeRunFailed(course.runs[0]);
      assertIsJust(calculateMessages(calculateMessagesProps), [{
        message: "You did not pass the edX course."
      }]);
    });
  });
});

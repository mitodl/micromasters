import React from 'react';
import PropTypes from 'prop-types';
import { shallow, mount } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';

import { makeDashboard, makeCourse } from '../../factories/dashboard';
import CourseRow from './CourseRow';
import CourseAction from './CourseAction';
import ProgressMessage from './courses/ProgressMessage';
import StatusMessages from './courses/StatusMessages';
import { FINANCIAL_AID_PARTIAL_RESPONSE } from '../../test_constants';
import { STATUS_NOT_PASSED } from '../../constants';
import { INITIAL_UI_STATE } from '../../reducers/ui';
import { makeRunCurrent, makeRunPast } from './courses/test_util';

describe('CourseRow', () => {
  let sandbox, openCourseContactDialogStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    openCourseContactDialogStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderRow = (props = {}, isShallow = false) => {
    let render = isShallow ? shallow : mount;
    return render(
      <CourseRow
        hasFinancialAid={true}
        financialAid={FINANCIAL_AID_PARTIAL_RESPONSE}
        prices={new Map([[345, 456]])}
        openFinancialAidCalculator={sandbox.stub}
        now={moment()}
        addCourseEnrollment={sandbox.stub()}
        course={null}
        openCourseContactDialog={openCourseContactDialogStub}
        ui={INITIAL_UI_STATE}
        checkout={() => undefined}
        {...props}
      />,
      {
        context: {
          router: {}
        },
        childContextTypes: {
          router:   PropTypes.object.isRequired
        }
      }
    );
  };

  it('displays relevant things for enrollable course', () => {
    const { programs } = makeDashboard();
    const course = programs[0].courses[0];
    makeRunCurrent(course.runs[0]);
    const wrapper = renderRow({
      course: course
    }, true);
    let courseRowProps = wrapper.props();
    let keys = Object.keys(courseRowProps).filter(key => (
      key !== 'children' && key !== 'className'
    ));
    let actionProps = wrapper.find(CourseAction).props();
    for (const key of keys) {
      assert.deepEqual(actionProps[key], courseRowProps[key]);
    }
    assert.deepEqual(wrapper.find('.course-title').text(), course.title);
  });

  it('should not display an "enroll" button if the run is not enrollable', () => {
    const { programs } = makeDashboard();
    const course = programs[0].courses[0];
    makeRunPast(course.runs[0]);
    const wrapper = renderRow({
      course: course
    }, true);
    assert.equal(0, wrapper.find(CourseAction).length);
  });

  it('displays relevant things for an enrolled course', () => {
    const { programs } = makeDashboard();
    const course = programs[0].courses[0];
    const courseRun = course.runs[0];
    course.runs[1].status = STATUS_NOT_PASSED;
    const wrapper = renderRow({
      course: course
    }, true);
    let progressProps = wrapper.find(ProgressMessage).props();
    assert.deepEqual(progressProps.course, course);
    assert.deepEqual(progressProps.courseRun, courseRun);
    progressProps.openCourseContactDialog('hey!');
    assert(openCourseContactDialogStub.called);

    let statusProps = wrapper.find(StatusMessages).props();
    assert.deepEqual(statusProps.course, course);
    assert.deepEqual(statusProps.firstRun, courseRun);

    assert.deepEqual(wrapper.find('.course-title').text(), course.title);
  });

  it('when enroll pay later selected', () => {
    let course = makeCourse();
    const wrapper = shallow(
      <CourseRow
        ui={{
          ...INITIAL_UI_STATE,
          showEnrollPayLaterSuccess: course.runs[0].course_id,
        }}
        course={course}
      />
    );
    assert.equal(
      wrapper.find('.enroll-pay-later-heading').text(),
      "You are now auditing this course"
    );
    assert.equal(
      wrapper.find('.enroll-pay-later-txt').text(),
      "But you still need to pay to get credit."
    );
  });
});

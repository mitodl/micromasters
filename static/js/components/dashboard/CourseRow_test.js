// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';

import CourseRow from './CourseRow';
import CourseAction from './CourseAction';
import CourseDescription from './CourseDescription';
import CourseGrade from './CourseGrade';
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  FINANCIAL_AID_PARTIAL_RESPONSE
} from '../../constants';

describe('CourseRow', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('forwards the appropriate props', () => {
    const course = DASHBOARD_RESPONSE[1].courses[0];
    const hasFinancialAid = true;
    const financialAid = FINANCIAL_AID_PARTIAL_RESPONSE;
    const coursePrice = COURSE_PRICES_RESPONSE[0];
    const openFinancialAidCalculator = sinon.stub();
    const now = moment();
    const checkout = sinon.stub();
    const addCourseEnrollment = sinon.stub();
    const wrapper = shallow(
      <CourseRow
        course={course}
        hasFinancialAid={hasFinancialAid}
        financialAid={financialAid}
        coursePrice={coursePrice}
        now={now}
        checkout={checkout}
        openFinancialAidCalculator={openFinancialAidCalculator}
        addCourseEnrollment={addCourseEnrollment}
      />
    );
    assert.deepEqual(wrapper.find(CourseAction).props(), {
      now,
      hasFinancialAid,
      financialAid,
      coursePrice,
      course,
      checkout,
      openFinancialAidCalculator,
      addCourseEnrollment,
    });
    assert.deepEqual(wrapper.find(CourseDescription).props(), {
      course,
    });
    assert.deepEqual(wrapper.find(CourseGrade).props(), {
      course,
    });
  });
});

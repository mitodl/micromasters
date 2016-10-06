// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseRow from './CourseRow';
import CourseAction from './CourseAction';
import CourseDescription from './CourseDescription';
import CourseStatus from './CourseStatus';
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  FINANCIAL_AID_PARTIAL_RESPONSE
} from '../../constants';

describe('CourseRow', () => {
  it('forwards the appropriate props', () => {
    const course = DASHBOARD_RESPONSE[1].courses[0];
    const hasFinancialAid = true;
    const financialAid = FINANCIAL_AID_PARTIAL_RESPONSE;
    const coursePrice = COURSE_PRICES_RESPONSE[0];
    const openFinancialAidCalculator = () => {};
    const now = moment();
    const checkout = () => null;
    const wrapper = shallow(
      <CourseRow
        course={course}
        hasFinancialAid={hasFinancialAid}
        financialAid={financialAid}
        coursePrice={coursePrice}
        now={now}
        checkout={checkout}
        openFinancialAidCalculator={openFinancialAidCalculator}
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
    });
    assert.deepEqual(wrapper.find(CourseDescription).props(), {
      course,
    });
    assert.deepEqual(wrapper.find(CourseStatus).props(), {
      course,
    });
  });
});

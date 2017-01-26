// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';

import { calculatePrices } from '../../lib/coupon';
import CourseListCard from './CourseListCard';
import CourseRow from './CourseRow';
import { DASHBOARD_RESPONSE, COURSE_PRICES_RESPONSE } from '../../test_constants';

describe('CourseListCard', () => {
  let program, sandbox;
  beforeEach(() => {
    program = _.cloneDeep(DASHBOARD_RESPONSE[1]);
    assert(program.courses.length > 0);
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderCourseListCard = (props = {}) => {
    let coursePrice = COURSE_PRICES_RESPONSE.find(
      coursePrice => coursePrice.program_id === program.id
    );

    let prices = calculatePrices([program], [coursePrice], []);
    return shallow(
      <CourseListCard
        program={program}
        addCourseEnrollment={() => undefined}
        prices={prices}
        {...props}
      />
    );
  };

  it('creates a CourseRow for each course', () => {
    let now = moment();
    let prices = new Map([[1, 2]]);
    const wrapper = renderCourseListCard({
      now: now,
      prices: prices,
    });
    assert.equal(wrapper.find(CourseRow).length, program.courses.length);
    let courses = _.sortBy(program.courses, 'position_in_program');
    wrapper.find(CourseRow).forEach((courseRow, i) => {
      const props = courseRow.props();
      assert.equal(props.now, now);
      assert.equal(props.prices, prices);
      assert.deepEqual(props.course, courses[i]);
    });
  });

  it("fills in now if it's missing in the props", () => {
    const wrapper = renderCourseListCard();
    let nows = wrapper.find(CourseRow).map(courseRow => courseRow.props().now);
    assert.isAbove(nows.length, 0);
    for (let now of nows) {
      // Each now must be exactly the same object
      assert.equal(now, nows[0]);
    }
  });

  it("doesn't show the personalized pricing box for programs without it", () => {
    program.financial_aid_availability = false;
    const wrapper = renderCourseListCard();
    assert.equal(wrapper.find('.personalized-pricing').length, 0);
  });
});

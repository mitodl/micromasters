// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import _ from 'lodash';

import CourseListCard from './CourseListCard';
import CourseRow from './CourseRow';
import { DASHBOARD_RESPONSE, COURSE_PRICES_RESPONSE } from '../../constants';

describe('CourseListCard', () => {
  let defaultCardParams = {
    coursePrice: _.cloneDeep(COURSE_PRICES_RESPONSE[0]),
    checkout: () => null
  };

  it('creates a CourseRow for each course', () => {
    const program = DASHBOARD_RESPONSE[1];
    assert(program.courses.length > 0);
    let now = moment();
    const wrapper = shallow(
      <CourseListCard program={program} now={now} {...defaultCardParams} />
    );
    assert.equal(wrapper.find(CourseRow).length, program.courses.length);
    wrapper.find(CourseRow).forEach((courseRow, i) => {
      const props = courseRow.props();
      assert.equal(props.now, now);
      assert.equal(props.course, program.courses[i]);
      assert.equal(props.checkout, defaultCardParams.checkout);
    });
  });

  it("fills in now if it's missing in the props", () => {
    const program = DASHBOARD_RESPONSE[1];
    assert(program.courses.length > 0);
    const wrapper = shallow(
      <CourseListCard program={program} {...defaultCardParams} />
    );
    let nows = wrapper.find(CourseRow).map(courseRow => courseRow.props().now);
    assert(nows.length > 0);
    for (let now of nows) {
      // Each now must be exactly the same object
      assert(now === nows[0]);
    }
  });

  it("doesn't show the personalized pricing box for programs without it", () => {
    const program = _.cloneDeep(DASHBOARD_RESPONSE[1]);
    program.financial_aid_availability = false;
    const wrapper = shallow(
      <CourseListCard program={program} {...defaultCardParams} />
    );
    assert.equal(wrapper.find('.personalized-pricing').length, 0);
  });
});

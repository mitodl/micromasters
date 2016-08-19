// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseListCard from './CourseListCard';
import CourseRow from './CourseRow';
import { DASHBOARD_RESPONSE } from '../../constants';

describe('CourseListCard', () => {
  it('creates a CourseRow for each course', () => {
    const program = DASHBOARD_RESPONSE[1];
    assert(program.courses.length > 0);
    let now = moment();
    const checkout = () => null;
    const wrapper = shallow(<CourseListCard program={program} now={now} checkout={checkout} />);
    assert.equal(wrapper.find(CourseRow).length, program.courses.length);
    wrapper.find(CourseRow).forEach((courseRow, i) => {
      const props = courseRow.props();
      assert.equal(props.now, now);
      assert.equal(props.course, program.courses[i]);
      assert.equal(props.checkout, checkout);
    });
  });

  it("fills in now if it's missing in the props", () => {
    const program = DASHBOARD_RESPONSE[1];
    assert(program.courses.length > 0);
    const wrapper = shallow(<CourseListCard program={program} checkout={() => null} />);
    let nows = wrapper.find(CourseRow).map(courseRow => courseRow.props().now);
    assert(nows.length > 0);
    for (let now of nows) {
      // Each now must be exactly the same object
      assert(now === nows[0]);
    }
  });
});

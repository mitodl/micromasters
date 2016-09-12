// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseRow from './CourseRow';
import CourseAction from './CourseAction';
import CourseDescription from './CourseDescription';
import CoursePrice from './CoursePrice';
import { DASHBOARD_RESPONSE } from '../../constants';

describe('CourseRow', () => {
  it('forwards the appropriate props', () => {
    const course = DASHBOARD_RESPONSE[1].courses[0];
    const now = moment();
    const checkout = () => null;
    const wrapper = shallow(<CourseRow course={course} now={now} checkout={checkout} />);
    assert.deepEqual(wrapper.find(CourseAction).props(), {
      now,
      course,
      checkout,
    });
    assert.deepEqual(wrapper.find(CourseDescription).props(), {
      course,
    });
    assert.deepEqual(wrapper.find(CoursePrice).props(), {
      course,
    });
  });
});

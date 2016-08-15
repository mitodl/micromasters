// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';

import CourseRow from './CourseRow';
import CourseAction from './CourseAction';
import CourseDescription from './CourseDescription';
import CourseGrade from './CourseGrade';
import { DASHBOARD_RESPONSE } from '../../constants';

describe('CourseRow', () => {
  it('forwards the appropriate props', () => {
    let course = DASHBOARD_RESPONSE[1].courses[0];
    let now = moment();
    let wrapper = shallow(<CourseRow course={course} now={now} />);
    for (let componentType of [CourseAction, CourseDescription, CourseGrade]) {
      assert.deepEqual(wrapper.find(componentType).props(), {
        now,
        course,
      });
    }
  });
});

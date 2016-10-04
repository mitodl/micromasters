// @flow
import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import type { Program } from '../../flow/programTypes';
import CourseRow from './CourseRow';
import FinancialAidCalculator from '../../containers/FinancialAidCalculator';


export default class CourseListCard extends React.Component {
  props: {
    checkout:                   Function,
    program:                    Program,
    now?:                       Object,
  };

  render() {
    let {
      program,
      now,
      checkout,
    } = this.props;
    if (now === undefined) {
      now = moment();
    }

    let sortedCourses = _.orderBy(program.courses, 'position_in_program');
    let courseRows = sortedCourses.map(course =>
      <CourseRow course={course} now={now} key={course.id} checkout={checkout} />
    );

    return <Card shadow={0} className="course-list">
      <FinancialAidCalculator />
      <CardTitle>Required Courses</CardTitle>
      {courseRows}
    </Card>;
  }
}

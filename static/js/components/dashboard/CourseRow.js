// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import CourseAction from './CourseAction';
import CourseGrade from './CourseGrade';
import CourseDescription from './CourseDescription';
import type { Course } from '../../flow/programTypes';

export default class CourseRow extends React.Component {
  props: {
    course: Course,
    now: moment$Moment,
  };

  render() {
    const { course, now } = this.props;

    return <Grid className="course-row">
      <Cell col={6}>
        <CourseDescription course={course} now={now} />
      </Cell>
      <Cell col={3}>
        <CourseGrade course={course} now={now} />
      </Cell>
      <Cell col={3}>
        <CourseAction course={course} now={now} />
      </Cell>
    </Grid>;
  }
}

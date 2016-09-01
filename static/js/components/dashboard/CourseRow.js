// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import CourseAction from './CourseAction';
import CourseGrade from './CourseGrade';
import CourseDescription from './CourseDescription';
import type { Course } from '../../flow/programTypes';
import {
  STATUS_OFFERED_NOT_ENROLLED,
  STATUS_ENROLLED_NOT_VERIFIED
} from '../../constants';


export default class CourseRow extends React.Component {
  props: {
    checkout: Function,
    course: Course,
    now: moment$Moment,
  };

  courseMiddleSection: Function = (course: Course, now: moment$Moment): React$Element<*> => {
    let firstRun = {};
    let price;
    let enrollmentStatus;
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
      if (course.status === STATUS_OFFERED_NOT_ENROLLED || course.status === STATUS_ENROLLED_NOT_VERIFIED) {
        if (firstRun.price) {
          price = <span className="course-price">${firstRun.price}</span>;
        }

        if (course.status === STATUS_OFFERED_NOT_ENROLLED) {
          enrollmentStatus = <span className="course-enrollment-description">Enrollment open</span>;
        }
        return (
          <div className="course-price">
            {price}
            {enrollmentStatus}
          </div>
        );
      }
    }
    return (
      <CourseGrade course={course} now={now} />
    );
  }

  render() {
    const { course, now, checkout } = this.props;

    return <Grid className="course-row">
      <Cell col={6}>
        <CourseDescription course={course} now={now} />
      </Cell>
      <Cell col={3}>
        {this.courseMiddleSection(course, now)}
      </Cell>
      <Cell col={3}>
        <CourseAction course={course} now={now} checkout={checkout} />
      </Cell>
    </Grid>;
  }
}

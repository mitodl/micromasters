// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import CourseAction from './CourseAction';
import CourseGrade from './CourseGrade';
import CourseDescription from './CourseDescription';
import type { Course } from '../../flow/programTypes';
import {
  STATUS_OFFERED_NOT_ENROLLED
} from '../../constants';


export default class CourseRow extends React.Component {
  props: {
    checkout: Function,
    course: Course,
    now: moment$Moment,
  };

  coursePriceOrGrade: Function = (course: Course, now: moment$Moment): React$Element<*> => {
    let firstRun = {};
    let price;
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
      if (course.status === STATUS_OFFERED_NOT_ENROLLED) {
        if (firstRun.price) {
          price = <span className="course-price-percent">{firstRun.price}$</span>;
        } else {
          price = <span className="course-price-percent">Free</span>;
        }
        return (
          <div className="course-price">
            {price}
            <span className="course-price-description">Enrollment open</span>
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
        {this.coursePriceOrGrade(course, now)}
      </Cell>
      <Cell col={3}>
        <CourseAction course={course} now={now} checkout={checkout} />
      </Cell>
    </Grid>;
  }
}

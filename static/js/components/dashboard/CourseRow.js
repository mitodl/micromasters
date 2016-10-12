// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import CourseAction from './CourseAction';
import CourseGrade from './CourseGrade';
import CourseDescription from './CourseDescription';
import type { Course, FinancialAidUserInfo } from '../../flow/programTypes';
import type { CoursePrice } from '../../flow/dashboardTypes';

export default class CourseRow extends React.Component {
  props: {
    checkout: Function,
    course: Course,
    coursePrice: CoursePrice,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator: () => void,
    now: moment$Moment,
    addCourseEnrollment: (courseId: string) => void,
  };

  render() {
    const {
      course,
      coursePrice,
      financialAid,
      hasFinancialAid,
      checkout,
      openFinancialAidCalculator,
      now,
      addCourseEnrollment,
    } = this.props;

    return <Grid className="course-row">
      <Cell col={6}>
        <CourseDescription course={course} />
      </Cell>
      <Cell col={2}>
        <CourseGrade course={course}/>
      </Cell>
      <Cell col={4}>
        <CourseAction
          course={course}
          coursePrice={coursePrice}
          hasFinancialAid={hasFinancialAid}
          financialAid={financialAid}
          checkout={checkout}
          openFinancialAidCalculator={openFinancialAidCalculator}
          now={now}
          addCourseEnrollment={addCourseEnrollment}
        />
      </Cell>
    </Grid>;
  }
}

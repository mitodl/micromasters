// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import CourseAction from './CourseAction';
import CourseStatus from './CourseStatus';
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
  };

  render() {
    const {
      course,
      coursePrice,
      financialAid,
      hasFinancialAid,
      checkout,
      openFinancialAidCalculator,
      now
    } = this.props;

    return <Grid className="course-row">
      <Cell col={6}>
        <CourseDescription course={course} />
      </Cell>
      <Cell col={2}>
        <CourseStatus course={course}/>
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
        />
      </Cell>
    </Grid>;
  }
}

// @flow
import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import type { Program } from '../../flow/programTypes';
import type { CoursePrice } from '../../flow/dashboardTypes';
import CourseRow from './CourseRow';
import FinancialAidCalculator from '../../containers/FinancialAidCalculator';

export default class CourseListCard extends React.Component {
  props: {
    checkout:                     Function,
    program:                      Program,
    courseEnrollAddStatus?:       string,
    coursePrice:                  CoursePrice,
    openFinancialAidCalculator?:  () => void,
    now?:                         Object,
    addCourseEnrollment:          (courseId: string) => void,
  };

  render() {
    let {
      program,
      coursePrice,
      now,
      checkout,
      openFinancialAidCalculator,
      addCourseEnrollment,
      courseEnrollAddStatus,
    } = this.props;
    if (now === undefined) {
      now = moment();
    }

    let sortedCourses = _.orderBy(program.courses, 'position_in_program');
    let courseRows = sortedCourses.map(course =>
      <CourseRow
        hasFinancialAid={program.financial_aid_availability}
        financialAid={program.financial_aid_user_info}
        course={course}
        courseEnrollAddStatus={courseEnrollAddStatus}
        coursePrice={coursePrice}
        key={course.id}
        checkout={checkout}
        openFinancialAidCalculator={openFinancialAidCalculator}
        now={now}
        addCourseEnrollment={addCourseEnrollment}
      />
    );

    return <Card shadow={0} className="course-list">
      <FinancialAidCalculator />
      <CardTitle>Required Courses</CardTitle>
      { courseRows }
    </Card>;
  }
}

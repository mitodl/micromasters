// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import R from 'ramda';

import CourseAction from './CourseAction';
import CourseGrade from './CourseGrade';
import CourseDescription from './CourseDescription';
import CourseSubRow from './CourseSubRow';
import type { Course, CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import type { CoursePrice } from '../../flow/dashboardTypes';
import {
  STATUS_MISSED_DEADLINE,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
} from '../../constants';

export default class CourseRow extends React.Component {
  props: {
    course: Course,
    checkout: Function,
    courseEnrollAddStatus?: string,
    coursePrice: CoursePrice,
    now: moment$Moment,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator: () => void,
    addCourseEnrollment: (courseId: string) => void,
  };

  shouldDisplayGradeColumn = (run: CourseRun): boolean => (
    run.status !== STATUS_MISSED_DEADLINE
  );

  needsToEnrollAgain = (run: CourseRun): boolean => (
    run.status === STATUS_MISSED_DEADLINE || run.status === STATUS_NOT_PASSED
  );

  futureEnrollableRun = (course: Course): CourseRun|null => (
    (course.runs.length > 1 && course.runs[1].status === STATUS_OFFERED) ? course.runs[1] : null
  );

  pastCourseRuns = (course: Course): Array<CourseRun> => (
    (course.runs.length > 1) ?
      R.drop(1, course.runs).filter(run => run.status !== STATUS_OFFERED) :
      []
  );

  getFirstRun(): CourseRun {
    const { course } = this.props;
    let firstRun: CourseRun = {};
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }
    return firstRun;
  }

  renderRowColumns(run: CourseRun): Array<React$Element<*>> {
    const {
      course,
      coursePrice,
      checkout,
      courseEnrollAddStatus,
      now,
      financialAid,
      hasFinancialAid,
      openFinancialAidCalculator,
      addCourseEnrollment,
    } = this.props;

    let lastColumnSize, lastColumnClass;
    let columns = [
      <Cell col={6} key="1">
        <CourseDescription courseRun={run} courseTitle={course.title} />
      </Cell>
    ];

    if (this.shouldDisplayGradeColumn(run)) {
      columns.push(
        <Cell col={3} key="2">
          <CourseGrade courseRun={run} />
        </Cell>
      );
      lastColumnSize = 3;
    } else {
      lastColumnSize = 6;
      lastColumnClass = 'long-description';
    }

    columns.push(
      <Cell col={lastColumnSize} className={lastColumnClass} key="3">
        <CourseAction
          courseRun={run}
          coursePrice={coursePrice}
          checkout={checkout}
          courseEnrollAddStatus={courseEnrollAddStatus}
          now={now}
          hasFinancialAid={hasFinancialAid}
          financialAid={financialAid}
          openFinancialAidCalculator={openFinancialAidCalculator}
          addCourseEnrollment={addCourseEnrollment}
        />
      </Cell>
    );
    return columns;
  }

  renderSubRows(): Array<React$Element<*>> {
    const {
      course,
      coursePrice,
      checkout,
      now,
      financialAid,
      hasFinancialAid,
      openFinancialAidCalculator,
      addCourseEnrollment,
    } = this.props;

    let firstRun = this.getFirstRun();
    let subRows = [];
    let subRowRuns = [];

    if (this.needsToEnrollAgain(firstRun)) {
      subRowRuns.push(this.futureEnrollableRun(course));
    }

    subRowRuns = subRowRuns.concat(this.pastCourseRuns(course));

    for (let [i, subRowRun] of Object.entries(subRowRuns)) {
      subRows.push(
        <CourseSubRow
          courseRun={subRowRun}
          coursePrice={coursePrice}
          checkout={checkout}
          now={now}
          hasFinancialAid={hasFinancialAid}
          financialAid={financialAid}
          openFinancialAidCalculator={openFinancialAidCalculator}
          addCourseEnrollment={addCourseEnrollment}
          key={i}
        />
      );
    }

    return subRows;
  }

  render() {
    let firstRun = this.getFirstRun();

    return <div className="course-container">
      <Grid className="course-row" key="0">
        { this.renderRowColumns(firstRun) }
      </Grid>
      { this.renderSubRows() }
    </div>;
  }
}

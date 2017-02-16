// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import R from 'ramda';

import CouponMessage from './CouponMessage';
import CourseAction from './CourseAction';
import CourseGrade from './CourseGrade';
import CourseDescription from './CourseDescription';
import CourseSubRow from './CourseSubRow';
import type { Course, CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import type {
  CalculatedPrices,
  Coupon,
} from '../../flow/couponTypes';
import {
  COUPON_CONTENT_TYPE_COURSE,
  STATUS_MISSED_DEADLINE,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
} from '../../constants';

export default class CourseRow extends React.Component {
  props: {
    coupon: ?Coupon,
    course: Course,
    courseEnrollAddStatus?: string,
    now: moment$Moment,
    prices: CalculatedPrices,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator: () => Promise<*>,
    addCourseEnrollment: (courseId: string) => Promise<*>,
    openCourseContactDialog: (course: Course, canContactCourseTeam: boolean) => Promise<*>,
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

  hasPaidForAnyCourseRun = (course: Course): boolean => (
    R.any(R.propEq('has_paid', true), course.runs)
  );

  // $FlowFixMe: CourseRun is sometimes an empty object
  getFirstRun(): CourseRun {
    const { course } = this.props;
    let firstRun = {};
    if (course.runs.length > 0) {
      firstRun = course.runs[0];
    }
    return firstRun;
  }

  renderRowColumns(run: CourseRun): Array<React$Element<*>> {
    const {
      course,
      courseEnrollAddStatus,
      now,
      prices,
      financialAid,
      hasFinancialAid,
      openFinancialAidCalculator,
      addCourseEnrollment,
      openCourseContactDialog
    } = this.props;

    let lastColumnSize, lastColumnClass;
    let columns = [
      <Cell col={6} key="1">
        <CourseDescription
          courseRun={run}
          courseTitle={course.title}
          hasContactEmail={course.has_contact_email}
          openCourseContactDialog={
            R.partial(openCourseContactDialog, [course, this.hasPaidForAnyCourseRun(course)])
          }
        />
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
          courseEnrollAddStatus={courseEnrollAddStatus}
          now={now}
          prices={prices}
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
      now,
      prices,
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
        // $FlowFixMe: Flow thinks subRowRun is mixed even though it's CourseRun|null
        <CourseSubRow
          courseRun={subRowRun}
          now={now}
          prices={prices}
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

  renderCouponMessage = () => {
    const { coupon, course } = this.props;

    if (coupon && coupon.content_type === COUPON_CONTENT_TYPE_COURSE && coupon.object_id === course.id) {
      return <CouponMessage coupon={coupon} />;
    }

    return null;
  };

  render() {
    let firstRun = this.getFirstRun();

    return <div className="course-container">
      <Grid className="course-row" key="0">
        { this.renderRowColumns(firstRun) }
      </Grid>
      {this.renderCouponMessage()}
      { this.renderSubRows() }
    </div>;
  }
}

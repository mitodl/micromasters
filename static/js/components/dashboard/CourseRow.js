// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import R from 'ramda';
import Icon from 'react-mdl/lib/Icon';

import CouponMessage from './CouponMessage';
import CourseAction from './CourseAction';
import CourseGrade from './CourseGrade';
import CourseDescription from './CourseDescription';
import CourseSubRow from './CourseSubRow';
import type { Course, CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import type { UIState } from '../../reducers/ui';
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
import { pickExistingProps } from '../../util/util';

export default class CourseRow extends React.Component {
  props: {
    coupon?: Coupon,
    course: Course,
    now: moment$Moment,
    prices: CalculatedPrices,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator: () => void,
    addCourseEnrollment: (courseId: string) => void,
    openCourseContactDialog: (course: Course, canContactCourseTeam: boolean) => void,
    setEnrollSelectedCourseRun: (r: CourseRun) => void,
    setEnrollCourseDialogVisibility: (b: boolean) => void,
    ui: UIState,
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
      now,
      prices,
      financialAid,
      hasFinancialAid,
      openFinancialAidCalculator,
      addCourseEnrollment,
      openCourseContactDialog,
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility,
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

    const optionalProps = pickExistingProps(['coupon'], this.props);

    columns.push(
      <Cell col={lastColumnSize} className={lastColumnClass} key="3">
        <CourseAction
          courseRun={run}
          now={now}
          prices={prices}
          hasFinancialAid={hasFinancialAid}
          financialAid={financialAid}
          openFinancialAidCalculator={openFinancialAidCalculator}
          addCourseEnrollment={addCourseEnrollment}
          setEnrollSelectedCourseRun={setEnrollSelectedCourseRun}
          setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibility}
          {...optionalProps}
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
      setEnrollSelectedCourseRun,
      setEnrollCourseDialogVisibility,
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
          setEnrollSelectedCourseRun={setEnrollSelectedCourseRun}
          setEnrollCourseDialogVisibility={setEnrollCourseDialogVisibility}
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

  renderEnrollmentSuccess = (): React$Element<*> => {
    return (
      <Grid className="course-sub-row enroll-pay-later-success">
        <Cell col={2} key="1">
          <Icon name="check" className="tick-icon"/>
        </Cell>,
        <Cell col={7} key="2">
          <p className="enroll-pay-later-heading">You are now auditing this course</p>
          <span className="enroll-pay-later-txt">But you still need to pay to get credit.</span>
        </Cell>
      </Grid>
    );
  }

  renderColumns = (firstRun: CourseRun): React$Element<*> => (
    <Grid className="course-row" key="0">
      { this.renderRowColumns(firstRun) }
    </Grid>
  )

  render() {
    const { ui } = this.props;
    let firstRun = this.getFirstRun();
    const showEnrollPayLaterSuccess =  (
      ui.showEnrollPayLaterSuccess && ui.showEnrollPayLaterSuccess === firstRun.course_id
    );

    return <div className="course-container">
      { showEnrollPayLaterSuccess ? this.renderEnrollmentSuccess() : this.renderColumns(firstRun) }
      {this.renderCouponMessage()}
      { this.renderSubRows() }
    </div>;
  }
}

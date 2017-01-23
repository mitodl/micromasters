// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import moment from 'moment';

import CourseAction from './CourseAction';
import type { CalculatedPrices } from '../../flow/couponTypes';
import type { CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import { isCurrentlyEnrollable, formatGrade } from './util';
import {
  STATUS_OFFERED,
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  DASHBOARD_FORMAT,
  DASHBOARD_MONTH_FORMAT,
} from '../../constants';

export default class CourseSubRow extends React.Component {
  props: {
    courseRun:                   CourseRun,
    courseEnrollAddStatus?:      string,
    now:                         moment$Moment,
    prices:                      CalculatedPrices,
    financialAid:                FinancialAidUserInfo,
    hasFinancialAid:             boolean,
    openFinancialAidCalculator:  () => void,
    addCourseEnrollment:         (courseId: string) => void,
  };

  getFormattedDateOrFuzzy(dateKey: string, fuzzyDateKey: string): string|null {
    const { courseRun } = this.props;
    if (courseRun[dateKey]) {
      return moment(courseRun[dateKey]).format(DASHBOARD_FORMAT);
    } else if (courseRun[fuzzyDateKey]) {
      return courseRun[fuzzyDateKey];
    }
    return null;
  }

  getPastRunDateDisplay(): React$Element<*> {
    const { courseRun } = this.props;

    let dateText;
    if (courseRun.course_end_date) {
      let endDate = moment(courseRun.course_end_date).format(DASHBOARD_MONTH_FORMAT);
      if (courseRun.course_start_date) {
        let startDate = moment(courseRun.course_start_date).format(DASHBOARD_MONTH_FORMAT);
        dateText = `${startDate} - ${endDate}`;
      } else {
        dateText = endDate;
      }
    } else if (courseRun.fuzzy_start_date) {
      dateText = courseRun.fuzzy_start_date;
    }
    return <div className="detail" key="1">{ dateText }</div>;
  }

  renderOfferedDescription(): Array<React$Element<*>> {
    const { courseRun, now } = this.props;

    let rows = [
      <div className="title" key="1">You can re-take this course!</div>
    ];

    let startDateText = this.getFormattedDateOrFuzzy('course_start_date', 'fuzzy_start_date');
    if (startDateText) {
      rows.push(
        <div className="detail" key="2">Next course starts: { startDateText }</div>
      );
    }

    let enrollStartDate = courseRun.enrollment_start_date ? moment(courseRun.enrollment_start_date) : null;
    if (isCurrentlyEnrollable(enrollStartDate, now)) {
      rows.push(
        <div className="detail" key="3">Enrollment open</div>
      );
    } else {
      let enrollStartDateText = this.getFormattedDateOrFuzzy('enrollment_start_date', 'fuzzy_enrollment_start_date');
      if (enrollStartDateText) {
        rows.push(
          <div className="detail" key="3">Enrollment starts: { enrollStartDateText }</div>
        );
      }
    }

    return rows;
  }

  renderDescription(): React$Element<*> {
    const { courseRun } = this.props;

    let description = (courseRun.status === STATUS_OFFERED) ?
      this.renderOfferedDescription() :
      this.getPastRunDateDisplay();
    return <div className="course-description">
      { description }
    </div>;
  }

  renderAction(): ?React$Element<any> {
    const { courseRun } = this.props;
    if ( courseRun.status === STATUS_OFFERED ) {
      return this.renderCourseRunAction(courseRun);
    } else if ( this.isCompletedCourseRun(courseRun) ) {
      return this.renderCourseRunStatus(courseRun);
    }
  }

  renderCourseRunAction = (courseRun: CourseRun) => {
    const {
      now,
      financialAid,
      hasFinancialAid,
      openFinancialAidCalculator,
      addCourseEnrollment,
      prices,
    } = this.props;

    let enrollStartDate = courseRun.enrollment_start_date ? moment(courseRun.enrollment_start_date) : null;
    if (isCurrentlyEnrollable(enrollStartDate, now)) {
      return <CourseAction
        courseRun={courseRun}
        now={now}
        prices={prices}
        hasFinancialAid={hasFinancialAid}
        financialAid={financialAid}
        openFinancialAidCalculator={openFinancialAidCalculator}
        addCourseEnrollment={addCourseEnrollment}
      />;
    }
  };

  courseRunStatus = (courseRun: CourseRun) => {
    if (courseRun.status === STATUS_NOT_PASSED ) {
      return 'Failed';
    } else if ( courseRun.status === STATUS_PASSED ) {
      return 'Passed';
    }
  };

  renderCourseRunStatus = (courseRun: CourseRun) => (
    <div className="course-action">
      { this.courseRunStatus(courseRun) }
    </div>
  );

  isCompletedCourseRun = (courseRun: CourseRun) => (
    [STATUS_NOT_PASSED, STATUS_PASSED].includes(courseRun.status)
  );

  courseRunGrade = (courseRun: CourseRun) => (
    this.isCompletedCourseRun(courseRun) ? formatGrade(courseRun.final_grade) : ''
  );

  render() {
    const { courseRun } = this.props;

    let subRowClass = 'course-sub-row';
    let contents;
    if (!courseRun) {
      contents = <Cell col={10}>
        <div>No future courses are currently scheduled.</div>
      </Cell>;
    } else {
      contents = [
        <Cell col={6} key="1">
          { this.renderDescription() }
        </Cell>,
        <Cell col={2} key="2">
          <div className="course-grade">
            { this.courseRunGrade(courseRun) }
          </div>
        </Cell>,
        <Cell col={4} key="3">
          { this.renderAction() }
        </Cell>
      ];
      if ( this.isCompletedCourseRun(courseRun) ) {
        subRowClass = `${subRowClass} course-completed`;
      }
    }

    return <Grid className={subRowClass}>
      { contents }
    </Grid>;
  }
}

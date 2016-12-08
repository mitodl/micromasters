// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import moment from 'moment';

import CourseAction from './CourseAction';
import type { CourseRun, FinancialAidUserInfo } from '../../flow/programTypes';
import type { CoursePrice } from '../../flow/dashboardTypes';
import { isCurrentlyEnrollable, formatGrade } from './util';
import {
  STATUS_OFFERED,
  STATUS_NOT_PASSED,
  DASHBOARD_FORMAT,
  DASHBOARD_MONTH_FORMAT,
} from '../../constants';

export default class CourseSubRow extends React.Component {
  props: {
    courseRun: CourseRun,
    courseEnrollAddStatus?: string,
    checkout: Function,
    coursePrice: CoursePrice,
    now: moment$Moment,
    financialAid: FinancialAidUserInfo,
    hasFinancialAid: boolean,
    openFinancialAidCalculator: () => void,
    addCourseEnrollment: (courseId: string) => void,
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

  renderAction(): React$Element<any> {
    const {
      courseRun,
      coursePrice,
      checkout,
      now,
      financialAid,
      hasFinancialAid,
      openFinancialAidCalculator,
      addCourseEnrollment
    } = this.props;

    if (courseRun.status === STATUS_OFFERED) {
      let enrollStartDate = courseRun.enrollment_start_date ? moment(courseRun.enrollment_start_date) : null;
      if (isCurrentlyEnrollable(enrollStartDate, now)) {
        return <CourseAction
          courseRun={courseRun}
          coursePrice={coursePrice}
          checkout={checkout}
          now={now}
          hasFinancialAid={hasFinancialAid}
          financialAid={financialAid}
          openFinancialAidCalculator={openFinancialAidCalculator}
          addCourseEnrollment={addCourseEnrollment}
        />;
      }
    }
    return <div className="course-action">
      { courseRun.status === STATUS_NOT_PASSED ? 'Failed' : '' }
    </div>;
  }

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
            { (courseRun.status === STATUS_NOT_PASSED) ? formatGrade(courseRun.final_grade) : '' }
          </div>
        </Cell>,
        <Cell col={4} key="3">
          { this.renderAction() }
        </Cell>
      ];
      if (courseRun.status === STATUS_NOT_PASSED) {
        subRowClass = `${subRowClass} course-not-passed`;
      }
    }

    return <Grid className={subRowClass}>
      { contents }
    </Grid>;
  }
}
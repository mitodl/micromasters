// @flow
import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import R from 'ramda';

import type { Program } from '../../flow/programTypes';
import CourseRow from './CourseRow';
import { courseListToolTip } from './util';
import FinancialAidCalculator from '../../containers/FinancialAidCalculator';

const ifPersonalizedPricing = R.curry((func, program, callback) => (
  program.financial_aid_availability ? func(callback) : null
));

const price = price => <span className="price">{ price }</span>;

const coursePriceRange = ifPersonalizedPricing(openDialog => (
  <div className="personalized-pricing">
    <div className="heading">
      How much does it cost?
      { courseListToolTip('filler-text', 'course-price') }
    </div>
    <div className="explanation">
      Courses cost varies between {price('$50')} and {price('$1000')} (full
      price), depending on your income and ability to pay.
    </div>
    <button
      className="mm-button dashboard-button"
      onClick={openDialog}
    >
      Calculate your cost
    </button>
  </div>
));


export default class CourseListCard extends React.Component {
  props: {
    checkout:                   Function,
    program:                    Program,
    now?:                       Object,
    openFinancialAidCalculator: () => void,
  };

  render() {
    let {
      program,
      now,
      checkout,
      openFinancialAidCalculator,
    } = this.props;
    if (now === undefined) {
      now = moment();
    }

    let sortedCourses = _.orderBy(program.courses, 'position_in_program');
    let courseRows = sortedCourses.map(course =>
      <CourseRow course={course} now={now} key={course.id} checkout={checkout} />
    );

    return <Card shadow={0} className="course-list">
      <FinancialAidCalculator />
      <CardTitle>Your Courses</CardTitle>
      { coursePriceRange(program, openFinancialAidCalculator) }
      {courseRows}
    </Card>;
  }
}

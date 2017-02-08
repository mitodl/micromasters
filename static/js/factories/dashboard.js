// @flow
import R from 'ramda';
import Decimal from 'decimal.js-light';

import {
  COUPON_TYPE_STANDARD,
  STATUS_OFFERED,
  FA_STATUS_APPROVED,
  PEARSON_PROFILE_ABSENT,
  PEARSON_PROFILE_SUCCESS,
  PEARSON_PROFILE_IN_PROGRESS,
  PEARSON_PROFILE_INVALID,
  PEARSON_PROFILE_SCHEDULABLE
} from '../constants';
import type {
  Coupon,
  Coupons,
} from '../flow/couponTypes';
import type {
  CoursePrice,
  CoursePrices,
  Dashboard,
} from '../flow/dashboardTypes';
import type {
  AvailablePrograms,
} from '../flow/enrollmentTypes';
import type {
  Course,
  CourseRun,
  Program,
} from '../flow/programTypes';

const makeCounter = (): (() => number) => {
  let gen = (function*() {
    let i = 1;
    while (true) {  // eslint-disable-line no-constant-condition
      yield i;
      i += 1;
    }
  })();
  // $FlowFixMe: Flow doesn't know that this always returns a number
  return () => gen.next().value;
};

const newCourseId = makeCounter();
const newProgramId = makeCounter();
const newRunId = makeCounter();
const newFinancialAidId = makeCounter();

export const makeDashboard = (): Dashboard => {
  return R.range(1, 3).map(makeProgram);
};

export const makeAvailablePrograms = (dashboard: Dashboard): AvailablePrograms => {
  return dashboard.map(program => ({
    enrolled: true,
    id: program.id,
    programpage_url: `/page/${program.id}`,
    title: `AvailableProgram for ${program.id}`,
  }));
};

export const makeRun = (position: number): CourseRun => {
  let runId = newRunId();
  return {
    id: runId,
    course_id: `course-v1:${runId}`,
    title: `Run ${runId}`,
    position: position,
    status: STATUS_OFFERED,
  };
};

export const makeCourse = (positionInProgram: number): Course => {
  let courseId = newCourseId();
  return {
    id: courseId,
    runs: R.reverse(R.range(1, 3)).map(makeRun),
    has_contact_email: false,
    position_in_program: positionInProgram,
    title: `Title for course ${courseId}`
  };
};

const PEARSON_STATUSES = [
  PEARSON_PROFILE_ABSENT,
  PEARSON_PROFILE_SUCCESS,
  PEARSON_PROFILE_IN_PROGRESS,
  PEARSON_PROFILE_INVALID,
  PEARSON_PROFILE_SCHEDULABLE,
  "",
];

export const makeProgram = (): Program => {
  let programId = newProgramId();
  return {
    title: `Title for course ${programId}`,
    courses: R.reverse(R.range(1, 3)).map(makeCourse),
    id: programId,
    financial_aid_availability: true,
    financial_aid_user_info: {
      application_status: FA_STATUS_APPROVED,
      date_documents_sent: '2016-01-01',
      has_user_applied: true,
      max_possible_cost: 50,
      min_possible_cost: 1000,
      id: newFinancialAidId(),
    },
    pearson_exam_status: PEARSON_STATUSES[
      Math.floor(Math.random() * PEARSON_STATUSES.length)
    ],
  };
};

export const makeCoupon = (program: Program): Coupon => ({
  coupon_code: `coupon_for_${program.id}`,
  coupon_type: COUPON_TYPE_STANDARD,
  content_type: 'program',
  amount_type: 'fixed-discount',
  amount: Decimal('50'),
  program_id: program.id,
  object_id: program.id,
});

export const makeCoupons = (programs: Dashboard): Coupons => (
  programs.map(makeCoupon)
);

export const makeCoursePrice = (program: Program): CoursePrice => ({
  program_id: program.id,
  price: Decimal(program.id * 100),
  financial_aid_availability: true,
  has_financial_aid_request: true
});

export const makeCoursePrices = (programs: Dashboard): CoursePrices => (
  programs.map(makeCoursePrice)
);

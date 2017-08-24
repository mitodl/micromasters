// @flow
import R from 'ramda';
import Decimal from 'decimal.js-light';
import moment from 'moment';
import {
  COUPON_TYPE_STANDARD,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
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
} from '../flow/couponTypes';
import type {
  CoursePrice,
  CoursePrices,
  Dashboard,
  ProgramLearners,
} from '../flow/dashboardTypes';
import type {
  AvailablePrograms,
} from '../flow/enrollmentTypes';
import type {
  Course,
  CourseRun,
  Program,
  ProctoredExamResult,
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
  const programs = R.range(1, 3).map(makeProgram);
  return { "programs": programs, "is_edx_data_fresh": true};
};

export const makeAvailablePrograms = (dashboard: Dashboard): AvailablePrograms => {
  return dashboard.programs.map(program => ({
    enrolled: true,
    id: program.id,
    programpage_url: `/page/${program.id}`,
    title: `AvailableProgram for ${program.id}`,
    total_courses: 1,
  }));
};

export const makeRun = (position: number): CourseRun => {
  const runId = newRunId();
  return {
    id: runId,
    course_id: `course-v1:${runId}`,
    title: `Run ${runId}`,
    position: position,
    course_end_date: moment().subtract(1, 'day').format(),
    status: STATUS_OFFERED,
    has_paid: false,
  };
};

export const makeCourse = (positionInProgram: number): Course => {
  const courseId = newCourseId();
  const runs = R.reverse(R.range(1, 3)).map(makeRun);
  return {
    id: courseId,
    runs: runs,
    has_contact_email: false,
    position_in_program: positionInProgram,
    title: `Title for course ${courseId}`,
    can_schedule_exam: false,
    exams_schedulable_in_future: [],
    has_to_pay: false,
    has_exam: false,
    proctorate_exams_grades: [],
    certificate_url: ""
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
  const programId = newProgramId();
  const courses = R.reverse(R.range(1, 3)).map(makeCourse);
  return {
    title: `Title for course ${programId}`,
    courses: courses,
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
    grade_average: Math.floor(Math.random() * 100),
  };
};

export const makeCoupon = (program: Program): Coupon => ({
  coupon_code: `coupon_for_${program.id}`,
  coupon_type: COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_PROGRAM,
  amount_type: COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  amount: Decimal('50'),
  program_id: program.id,
  object_id: program.id,
});

export const makeCourseCoupon = (course: Course, program: Program): Coupon => ({
  coupon_code: `coupon_for_course_${course.id}`,
  coupon_type: COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_COURSE,
  amount_type: COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  amount: Decimal('50'),
  program_id: program.id,
  object_id: course.id,
});

export const makeCoursePrice = (program: Program): CoursePrice => ({
  program_id: program.id,
  price: Decimal(program.id * 100),
  financial_aid_availability: true,
  has_financial_aid_request: true
});

export const makeCoursePrices = (dashboard: Dashboard): CoursePrices => (
  dashboard.programs.map(makeCoursePrice)
);

export const makeProgramLearners = (): ProgramLearners => ({
  learners: [
    {
      username:'Jane',
      image_small: 'url'
    }
  ],
  learners_count: 1
}
);

export const makeProctoredExamResult = (): ProctoredExamResult => {
  let passingScore = Math.random() * 100;
  let score = Math.random() * 100;

  return {
    exam_date:               moment().format(),
    passing_score:           passingScore,
    score:                   score,
    grade:                   score > passingScore ? 'Pass' : 'Fail',
    client_authorization_id: 'asdfj3j3rj;lkjd',
    passed:                  score > passingScore,
    percentage_grade:        score / 100,
  };
};

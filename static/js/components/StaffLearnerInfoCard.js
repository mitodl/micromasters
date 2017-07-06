// @flow
import React from 'react';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import R from 'ramda';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import { circularProgressWidget } from './ProgressWidget';
import { programCourseInfo, classify, formatPrice } from '../util/util';
import type { Program } from '../flow/programTypes';
import CourseDescription from '../components/dashboard/CourseDescription';
import Progress from '../components/dashboard/courses/Progress';
import Grades from '../components/dashboard/courses/Grades';
import { STATUS_OFFERED } from '../constants';
import { S, getm } from '../lib/sanctuary';
import type { DialogVisibilityState } from '../reducers/ui';
import type { CouponPrices } from '../flow/couponTypes';

type StaffLearnerCardProps = {
  program: Program,
  setShowGradeDetailDialog: (b: boolean, t: string) => void,
  dialogVisibility:         DialogVisibilityState,
  prices:                   CouponPrices,
};

const formatCourseRun = R.curry((title, run) => ({
  courseRun: run,
  courseTitle: title,
  hasContactEmail: false,
}));

const formatCourseInfo = course => (
  [course
    .runs
    .filter(R.propSatisfies(s => s !== STATUS_OFFERED, 'status'))
    .map(formatCourseRun(course.title)),
    course,
  ]
);

const pruneUnenrolledCourses = R.filter(([runs]) => (
  !R.isEmpty(runs)
));

const renderCourseRuns = R.addIndex(R.map)((props, index) => (
  <div className="course-container" key={index}>
    <Grid className="course-row">
      <Cell col={6} key='1'>
        <CourseDescription {...props} index={index} />
      </Cell>
      <Cell col={6} key='2'>
        <Progress {...props} />
      </Cell>
    </Grid>
  </div>
));

const renderCourseInfo = R.curry((setShowGradeDetailDialog, dialogVisibility, [formattedRuns, course], index) => (
  <div key={index}>
    { renderCourseRuns(formattedRuns) }
    <Grid>
      <Cell col={6}>
        <Grades
          course={course}
          setShowGradeDetailDialog={setShowGradeDetailDialog}
          dialogVisibility={dialogVisibility}
        />
      </Cell>
    </Grid>
  </div>
));

const programInfoBadge = (title, text) => (
  <div className={`program-info-badge ${classify(title)}`}>
    <div className="program-badge">
      { text }
    </div>
    <div className="title">
      { title }
    </div>
  </div>
);

const displayCourseRuns = (setShowGradeDetailDialog, dialogVisibility, program) => {
  return R.compose(
    R.addIndex(R.map)(renderCourseInfo(setShowGradeDetailDialog, dialogVisibility)),
    pruneUnenrolledCourses,
    R.map(formatCourseInfo),
    R.prop('courses')
  )(program);
};

// getProgramProp :: String -> Program -> Either String Number
const getProgramProp = R.curry((prop, program) => (
  S.maybeToEither('--', getm(prop, program))
));

// formatCourseGrade :: Program -> String
const formatCourseGrade = R.compose(
  R.prop('value'),
  S.map(grade => `${grade}%`),
  getProgramProp('grade_average')
);

const StaffLearnerInfoCard = (props: StaffLearnerCardProps) => {
  const { program, dialogVisibility, setShowGradeDetailDialog, prices } = props;
  const { totalPassedCourses, totalCourses } = programCourseInfo(program);
  const courseProgramPrice = prices.pricesInclCouponByProgram.get(program.id);
  let priceToDisplay = "--";

  if (courseProgramPrice) {
    priceToDisplay = formatPrice(courseProgramPrice.price.toString());
  }

  return (
    <Card shadow={1} className="staff-learner-info-card course-list">
      <CardTitle>
        { `Progress - ${program.title}` }
      </CardTitle>
      <div className="program-info">
        <div className="row">
          <div className="progress-widget">
            { circularProgressWidget(63, 7, totalPassedCourses, totalCourses) }
          </div>
          { programInfoBadge('Average program grade', formatCourseGrade(program)) }
          { programInfoBadge('Course Price', priceToDisplay) }
        </div>
        { displayCourseRuns(setShowGradeDetailDialog, dialogVisibility, program) }
      </div>
    </Card>
  );
};

export default StaffLearnerInfoCard;

// @flow
import React from 'react';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import R from 'ramda';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import { circularProgressWidget } from './ProgressWidget';
import { programCourseInfo } from '../util/util';
import type { Program } from '../flow/programTypes';
import CourseDescription from '../components/dashboard/CourseDescription';
import CourseGrade from '../components/dashboard/CourseGrade';
import { STATUS_OFFERED } from '../constants';

type StaffLearnerCardProps = {
  program: Program,
};

const formatCourseRun = R.curry((title, run) => ({
  courseRun: run,
  courseTitle: title,
  hasContactEmail: false,
}));

const formatCourseRuns = course => (
  course
    .runs
    .filter(R.propSatisfies(s => s !== STATUS_OFFERED, 'status'))
    .map(formatCourseRun(course.title))
);

const renderCourseRuns = R.addIndex(R.map)((props, index) => (
  <div className="course-container" key={index}>
    <Grid className="course-row">
      <Cell col={6} key='1'>
        <CourseDescription {...props} index={index} />
      </Cell>
      <Cell col={6} key='2'>
        <CourseGrade {...props} />
      </Cell>
    </Grid>
  </div>
));

const programInfoBadge = (title, text) => (
  <div className="program-info-badge">
    <div className="program-badge">
      { text }
    </div>
    <div className="title">
      { title }
    </div>
  </div>
);

const displayCourseRuns = R.compose(
  renderCourseRuns, R.flatten, R.map(formatCourseRuns), R.prop('courses')
);

const StaffLearnerInfoCard = (props: StaffLearnerCardProps) => {
  const { program } = props;
  const { totalPassedCourses, totalCourses } = programCourseInfo(program);

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
          { programInfoBadge('Average program grade', '--') }
          { programInfoBadge('Course Price', '--') }
        </div>
        { displayCourseRuns(program) }
      </div>
    </Card>
  );
};

export default StaffLearnerInfoCard;

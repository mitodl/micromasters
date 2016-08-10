// @flow
import React from 'react';
import _ from 'lodash';
import RaisedButton from 'material-ui/RaisedButton';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import { toggleDashboardExpander } from '../actions/ui';
import {
  makeCourseStatusDisplay,
  makeCourseProgressDisplay,
  makeRunStatusDisplay,
} from '../util/courseList';
import {
  STATUS_PASSED,
  DASHBOARD_COURSE_HEIGHT,
  DASHBOARD_RUN_HEIGHT,
} from '../constants';

class CourseList extends React.Component {
  static propTypes = {
    dashboard: React.PropTypes.object.isRequired,
    expander: React.PropTypes.object.isRequired,
    dispatch: React.PropTypes.func.isRequired,
  };

  render() {
    const { dashboard, dispatch, expander } = this.props;

    let programs = dashboard.programs.map(program => {
      let sortedCourses = _.sortBy(program.courses, 'position_in_program');
      let totalCourses = program.courses.length;
      let coursesPassed = 0;

      let table = sortedCourses.map((course, i) => {
        let isTop = i === 0;
        let isBottom = i === sortedCourses.length - 1;

        if (course.status === STATUS_PASSED) {
          coursesPassed++;
        }

        let courseRuns = [];
        if (expander[course.id]) {
          courseRuns = course.runs.map(run =>
            <Grid style={{height: DASHBOARD_RUN_HEIGHT}} key={run.id}>
              <Cell
                col={6}
                className="course-run-title"
              >
                {run.title}
              </Cell>
              <Cell col={4} className="course-run-status">
                {makeRunStatusDisplay(run)}
              </Cell>
            </Grid>
          );
        }

        let expanderSpan;
        if (course.runs.length > 0) {
          const toggleExpander = () => {
            dispatch(toggleDashboardExpander(course.id, !expander[course.id]));
          };
          expanderSpan = <span
            onClick={toggleExpander}
            className={`glyphicon glyphicon-menu-${expander[course.id] ? 'up' : 'down'}`}
            style={{cursor: "pointer"}}
          >
            <span className="sr-only">
              Click here to show or hide course runs
            </span>
          </span>;
        }

        let height = DASHBOARD_COURSE_HEIGHT + courseRuns.length * DASHBOARD_RUN_HEIGHT;
        return <div
          key={course.id}
          className="course-list-body course-list-row"
          style={{height: height}}
        >
          <Grid style={{height: DASHBOARD_COURSE_HEIGHT}} className="course-list-center">
            <Cell col={6} className="course-title">
              {course.title} {expanderSpan}
            </Cell>
            <Cell col={4} className="course-status">
              {makeCourseStatusDisplay(course)}
            </Cell>
            <Cell col={2} className="course-progress">
              {makeCourseProgressDisplay(course, isTop, isBottom, courseRuns.length)}
            </Cell>
          </Grid>
          {courseRuns}
        </div>;
      });

      let applyForMSBtnLabel = `Apply for the ${program.title} Master’s Degree`;
      const btnStyle = {
        'textTransform': 'none'
      };

      return (
        <div key={program.id} className="program">
          <Grid>
            <Cell col={8}>
              <div className="course-list">
                <Grid
                  className="course-list-header course-list-center course-list-row"
                  style={{height: DASHBOARD_COURSE_HEIGHT}}
                >
                  <Cell col={6} className="course-title">
                    {program.title}
                  </Cell>
                  <Cell col={4} className="course-status "/>
                  <Cell col={2} className="course-progress">
                    Progress
                  </Cell>
                </Grid>
                {table}
              </div>
            </Cell>
          </Grid>
          <div className="apply-for-ms">
            <br/>
            <p>You need to pass {totalCourses - coursesPassed} more courses
              before you can apply for the <strong>{program.title}</strong> Master’s Degree.</p>
            <RaisedButton label={applyForMSBtnLabel} disabled={true} labelStyle={btnStyle} />
          </div>
        </div>
      );
    });

    return <div>
      {programs}
    </div>;
  }
}

export default CourseList;

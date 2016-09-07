// @flow
/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import Loader from 'react-loader';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import { FETCH_PROCESSING, checkout } from '../actions';
import { createForm } from '../util/util';
import CourseListCard from '../components/dashboard/CourseListCard';
import DashboardUserCard from '../components/dashboard/DashboardUserCard';
import ErrorMessage from '../components/ErrorMessage';
import ProgressWidget from '../components/ProgressWidget';
import type { DashboardState } from '../flow/dashboardTypes';
import type { ProgramEnrollment } from '../flow/enrollmentTypes';
import type { ProfileGetResult } from '../flow/profileTypes';

class DashboardPage extends React.Component {
  props: {
    profile:                  ProfileGetResult,
    currentProgramEnrollment: ProgramEnrollment,
    dashboard:                DashboardState,
    dispatch:                 Dispatch,
  };

  dispatchCheckout = (courseId: string) => {
    const { dispatch } = this.props;

    return dispatch(checkout(courseId)).then(result => {
      const { payload, url } = result;

      const form = createForm(url, payload);
      const body = document.querySelector("body");
      body.appendChild(form);
      form.submit();
    });
  };

  render() {
    const {
      dashboard,
      profile: { profile },
      currentProgramEnrollment,
    } = this.props;
    const loaded = dashboard.fetchStatus !== FETCH_PROCESSING;
    let errorMessage;
    let dashboardContent;
    // if there are no errors coming from the backend, simply show the dashboard
    let program;
    if (currentProgramEnrollment !== null) {
      program = dashboard.programs.find(program => program.id === currentProgramEnrollment.id);
    }
    if (dashboard.errorInfo !== undefined) {
      errorMessage = <ErrorMessage errorInfo={dashboard.errorInfo}/>;
    } else if (program === null || program === undefined) {
      errorMessage = <ErrorMessage errorInfo={{user_message: "No program enrollment is available."}} />;
    } else {
      dashboardContent = (
        <div className="double-column">
          <div className="first-column">
            <DashboardUserCard profile={profile} program={program}/>
            <CourseListCard
              program={program}
              key={program.id}
              checkout={this.dispatchCheckout}
            />
          </div>
          <div className="second-column">
            <ProgressWidget />
            <Card shadow={0}>
              <CardTitle>Learners Near Me</CardTitle>
            </Card>
          </div>
        </div>
      );
    }
    return (
      <div className="dashboard">
        <Loader loaded={loaded}>
          {errorMessage}
          {dashboardContent}
        </Loader>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  let profile = {
    profile: {}
  };
  if (state.profiles[SETTINGS.username] !== undefined) {
    profile = state.profiles[SETTINGS.username];
  }

  return {
    profile: profile,
    dashboard: state.dashboard,
    currentProgramEnrollment: state.currentProgramEnrollment,
  };
};

export default connect(mapStateToProps)(DashboardPage);

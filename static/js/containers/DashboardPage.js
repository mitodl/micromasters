// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from 'react-loader';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import { STATUS_PASSED } from '../constants';
import { FETCH_PROCESSING } from '../actions';
import CourseListCard from '../components/dashboard/CourseListCard';
import DashboardUserCard from '../components/dashboard/DashboardUserCard';
import ErrorMessage from '../components/ErrorMessage';
import ProgressWidget from '../components/ProgressWidget';
import type { Profile } from '../flow/profileTypes';

class DashboardPage extends React.Component {
  props: {
    profile:    {profile: Profile},
    dashboard:  Object,
  };

  render() {
    const {
      dashboard,
      profile: { profile },
    } = this.props;
    const loaded = dashboard.fetchStatus !== FETCH_PROCESSING;
    let errorMessage;
    let dashboardContent;
    // if there are no errors coming from the backend, simply show the dashboard
    if (dashboard.errorInfo === undefined){
      // For now we are showing only the first program in list
      let program = dashboard.programs[0];
      if (program !== undefined) {
        dashboardContent = (
          <div className="double-column">
            <div className="first-column">
              <DashboardUserCard profile={profile} program={program}/>
              <CourseListCard program={program}/>
            </div>
            <div className="second-column">
              <ProgressWidget />
              <Card shadow={0}>
                <CardTitle>Learners Near Me</CardTitle>
              </Card>
              <Card shadow={0}>
                <CardTitle>Histogram</CardTitle>
              </Card>
            </div>
          </div>
        );
      }
    } else {
      errorMessage = <ErrorMessage errorInfo={dashboard.errorInfo} />;
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
  };
};

export default connect(mapStateToProps)(DashboardPage);

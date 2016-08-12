// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from 'react-loader';
import { Card, CardTitle } from 'react-mdl/lib/Card';

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
    if (dashboard.errorInfo === undefined && dashboard.programs.length > 0){
      // For now show all programs available. We should restrict this to one program later on.
      let cards = dashboard.programs.map(program => (
        <CourseListCard program={program} key={program.id} />
      ));
      // HACK: We need a program to show the title of
      let firstProgram = dashboard.programs[0];
      dashboardContent = (
        <div className="double-column">
          <div className="first-column">
            <DashboardUserCard profile={profile} program={firstProgram}/>
            {cards}
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

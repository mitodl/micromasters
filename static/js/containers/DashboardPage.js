// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from 'react-loader';

import { FETCH_PROCESSING } from '../actions';
import type { Dispatch } from 'redux';

import Jumbotron from '../components/Jumbotron';
import CourseList from '../components/CourseList';
import ErrorMessage from '../components/ErrorMessage';
import { getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';

class DashboardPage extends React.Component {
  props: {
    profile:    {profile: Profile},
    dashboard:  Object,
    dispatch:   Dispatch,
    expander:   Object,
  };

  render() {
    const {
      dashboard,
      expander,
      dispatch,
      profile: { profile },
    } = this.props;
    const loaded = dashboard.fetchStatus !== FETCH_PROCESSING;
    let preferredName = getPreferredName(profile);
    let errorMessage;
    let dashboardContent;
    // if there are no errors coming from the backend, simply show the dashboard
    if (dashboard.errorInfo === undefined){
      dashboardContent = <div>
        <div className="card-header">
          Your Status
        </div>
        <div className="card-copy">
          <CourseList dashboard={dashboard} expander={expander} dispatch={dispatch} />
        </div>
      </div>;
    } else {
      errorMessage = <ErrorMessage errorInfo={dashboard.errorInfo} />;
    }
    return (
      <Jumbotron profile={profile} text={preferredName}>
        <Loader loaded={loaded}>
          {errorMessage}
          {dashboardContent}
        </Loader>
      </Jumbotron>
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
    expander: state.ui.dashboardExpander
  };
};

export default connect(mapStateToProps)(DashboardPage);

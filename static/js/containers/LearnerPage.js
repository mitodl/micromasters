// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from '../components/Loader';
import R from 'ramda';

import { FETCH_PROCESSING, FETCH_SUCCESS } from '../actions';
import { clearProfile } from '../actions/profile';
import {
  profileFormContainer,
  mapStateToProfileProps,
  childrenWithProps,
} from './ProfileFormContainer';
import ErrorMessage from '../components/ErrorMessage';
import type { ProfileContainerProps } from './ProfileFormContainer';
import { fetchDashboard } from '../actions/dashboard';
import { hasAnyStaffRole } from '../lib/roles';
import { getDashboard } from '../reducers/util';
import { S } from '../lib/sanctuary';
import type { DashboardsState } from '../flow/dashboardTypes';

const notFetchingOrFetched = R.compose(
  R.not, R.contains(R.__, [FETCH_PROCESSING, FETCH_SUCCESS])
);

type LearnerPageProps = ProfileContainerProps & {
  dashboard: DashboardsState,
};

class LearnerPage extends React.Component<*, LearnerPageProps, *> {
  componentDidMount() {
    const { params: { username }, fetchProfile } = this.props;
    fetchProfile(username);
    this.fetchDashboard();
  }

  componentDidUpdate() {
    const { params: { username }, fetchProfile } = this.props;
    fetchProfile(username);
    this.fetchDashboard();
  }

  componentWillUnmount() {
    const { dispatch, params: { username } } = this.props;
    if (!SETTINGS.user || SETTINGS.user.username !== username) {
      // don't erase the user's own profile from the state
      dispatch(clearProfile(username));
    }
  }

  getFocusedDashboard() {
    const { dashboard, params: { username }} = this.props;
    return getDashboard(username, dashboard).filter(() => (
      hasAnyStaffRole(SETTINGS.roles)
    ));
  }

  fetchDashboard() {
    const { dispatch, params: { username } } = this.props;

    this.getFocusedDashboard()
      .filter(R.propSatisfies(notFetchingOrFetched, 'fetchStatus'))
      .map(() => dispatch(fetchDashboard(username)));
  }

  render() {
    const {
      params: { username },
      profiles,
      children,
      profileProps,
    } = this.props;

    let profile = {};
    let toRender = null;
    let loaded = false;
    if (profiles[username] !== undefined) {
      profile = profiles[username];
      loaded = profiles[username].getStatus !== FETCH_PROCESSING;
      let props = {
        dashboard: S.maybe({}, R.identity, this.getFocusedDashboard()),
        ...profileProps(profile)
      };
      toRender = childrenWithProps(children, props);
    }
    const { errorInfo } = profile;
    return <Loader loaded={loaded}>
      {errorInfo && loaded ? <ErrorMessage errorInfo={errorInfo} /> : toRender }
    </Loader>;
  }
}

const mapStateToProps = state => {
  return {
    dashboard: state.dashboard,
    ...mapStateToProfileProps(state),
  };
};

export default R.compose(
  connect(mapStateToProps),
  profileFormContainer
)(LearnerPage);

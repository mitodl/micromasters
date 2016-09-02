// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  FETCH_SUCCESS,
  fetchUserProfile,
  clearProfile,
  fetchDashboard,
  clearDashboard,
  startProfileEdit,
  updateProfileValidation,
} from '../actions/index';
import {
  clearEnrollments,
  fetchProgramEnrollments,
} from '../actions/enrollments';
import { clearUI, setProfileStep } from '../actions/ui';
import { validateProfileComplete } from '../util/validation';
import type { Dashboard } from '../flow/dashboardTypes';
import type { ProgramEnrollments } from '../flow/enrollmentTypes';
import type { Profile } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

const PROFILE_REGEX = /^\/profile\/?[a-z]?/;

class App extends React.Component {
  props: {
    children:     React$Element<*>[],
    userProfile:  {profile: Profile, getStatus: string},
    location:     Object,
    dispatch:     Dispatch,
    dashboard:    Dashboard,
    enrollments:  ProgramEnrollments,
    history:      Object,
    ui:           UIState,
  };

  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  componentDidMount() {
    this.fetchUserProfile(SETTINGS.username);
    this.fetchDashboard();
    this.fetchEnrollments();
    this.requireProfileFilledOut();
    this.requireCompleteProfile();
  }

  componentDidUpdate() {
    this.fetchUserProfile(SETTINGS.username);
    this.fetchDashboard();
    this.fetchEnrollments();
    this.requireProfileFilledOut();
    this.requireCompleteProfile();
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch(clearProfile(SETTINGS.username));
    dispatch(clearDashboard());
    dispatch(clearUI());
    dispatch(clearEnrollments());
  }

  fetchUserProfile(username) {
    const { userProfile, dispatch } = this.props;
    if (userProfile.getStatus === undefined) {
      dispatch(fetchUserProfile(username));
    }
  }

  fetchDashboard() {
    const { dashboard, dispatch } = this.props;
    if (dashboard.fetchStatus === undefined) {
      dispatch(fetchDashboard());
    }
  }

  fetchEnrollments() {
    const { enrollments, dispatch } = this.props;
    if (enrollments.getStatus === undefined) {
      dispatch(fetchProgramEnrollments());
    }
  }

  requireProfileFilledOut() {
    const { userProfile, location: { pathname } } = this.props;
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      !userProfile.profile.filled_out &&
      !(PROFILE_REGEX.test(pathname))
    ) {
      this.context.router.push('/profile');
    }
  }

  requireCompleteProfile() {
    const {
      userProfile,
      userProfile: { profile },
      location: { pathname },
      dispatch,
    } = this.props;
    const [ complete, step, errors] = validateProfileComplete(profile);
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      profile.agreed_to_terms_of_service &&
      !PROFILE_REGEX.test(pathname) &&
      !complete
    ) {
      dispatch(startProfileEdit(SETTINGS.username));
      dispatch(updateProfileValidation(SETTINGS.username, errors));
      if ( step !== null ) {
        dispatch(setProfileStep(step));
      }
      this.context.router.push('/profile');
    }
  }

  render() {
    const { children, location: { pathname } } = this.props;
    const { router } = this.context;

    let empty = false;
    if (PROFILE_REGEX.test(pathname)) {
      empty = true;
    }
    let pushUrl = url => router.push(url);

    return (
      <div id="app">
        <Navbar
          empty={empty}
          changeUrl={pushUrl}
          pathname={pathname}
        />
        <div className="page-content">
          { children }
        </div>
        <Footer />
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
    userProfile:  profile,
    dashboard:    state.dashboard,
    ui:           state.ui,
    enrollments:  state.enrollments,
  };
};

export default connect(mapStateToProps)(App);

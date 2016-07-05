// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import Header from '../components/Header';
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
import { clearUI, setProfileStep } from '../actions/ui';
import { validateProfileComplete } from '../util/validation';
import type { Profile } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

const TERMS_OF_SERVICE_REGEX = /\/terms_of_service\/?/;
const PROFILE_REGEX = /^\/profile\/?[a-z]?/;

class App extends React.Component {
  props: {
    children:     React$Element[],
    userProfile:  {profile: Profile, getStatus: string},
    location:     Object,
    dispatch:     Dispatch,
    dashboard:    Object,
    history:      Object,
    ui:           UIState,
  };

  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  componentDidMount() {
    this.fetchUserProfile(SETTINGS.username);
    this.fetchDashboard();
    this.requireTermsOfService();
    this.requireProfileFilledOut();
    this.requireCompleteProfile();
  }

  componentDidUpdate() {
    this.fetchUserProfile(SETTINGS.username);
    this.fetchDashboard();
    this.requireTermsOfService();
    this.requireProfileFilledOut();
    this.requireCompleteProfile();
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch(clearProfile(SETTINGS.username));
    dispatch(clearDashboard());
    dispatch(clearUI());
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

  requireTermsOfService() {
    const { userProfile, location: { pathname } } = this.props;
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      !userProfile.profile.agreed_to_terms_of_service &&
      !(TERMS_OF_SERVICE_REGEX.test(pathname))
    ) {
      this.context.router.push('/terms_of_service');
    }
  }

  requireProfileFilledOut() {
    const { userProfile, location: { pathname } } = this.props;
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      !userProfile.profile.filled_out &&
      !(TERMS_OF_SERVICE_REGEX.test(pathname)) &&
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

    let empty = false;
    if (TERMS_OF_SERVICE_REGEX.test(pathname)) {
      empty = true;
    }

    return (
      <div className="app-media layout-boxed">
        <Header empty={empty} />
        <div className="main-content">
          {children}
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
  };
};

export default connect(mapStateToProps)(App);

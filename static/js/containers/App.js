// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import ErrorMessage from '../components/ErrorMessage';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  FETCH_SUCCESS,
  FETCH_FAILURE,
  fetchDashboard,
  clearDashboard,
} from '../actions';
import {
  fetchUserProfile,
  clearProfile,
  startProfileEdit,
  updateProfileValidation,
} from '../actions/profile';
import {
  clearEnrollments,
  fetchProgramEnrollments,
  setCurrentProgramEnrollment,
} from '../actions/enrollments';
import {
  setEnrollDialogVisibility,
  setEnrollSelectedProgram,
} from '../actions/ui';
import { clearUI, setProfileStep } from '../actions/ui';
import { validateProfileComplete } from '../util/validation';
import type { DashboardState } from '../flow/dashboardTypes';
import type {
  ProgramEnrollment,
  ProgramEnrollmentsState,
} from '../flow/enrollmentTypes';
import type { ProfileGetResult } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

const PROFILE_REGEX = /^\/profile\/?[a-z]?/;

class App extends React.Component {
  props: {
    children:                 React$Element<*>[],
    userProfile:              ProfileGetResult,
    location:                 Object,
    currentProgramEnrollment: ProgramEnrollment,
    dispatch:                 Dispatch,
    dashboard:                DashboardState,
    enrollments:              ProgramEnrollmentsState,
    history:                  Object,
    ui:                       UIState,
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

  setEnrollDialogVisibility = (visibility: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setEnrollDialogVisibility(visibility));
  };

  setEnrollSelectedProgram = (programId: number): void => {
    const { dispatch } = this.props;
    dispatch(setEnrollSelectedProgram(programId));
  };

  setCurrentProgramEnrollment = (enrollment: ProgramEnrollment): void => {
    const { dispatch } = this.props;
    dispatch(setCurrentProgramEnrollment(enrollment));
  };

  render() {
    const {
      currentProgramEnrollment,
      enrollments,
      ui: {
        enrollDialogVisibility,
        enrollSelectedProgram,
      },
      location: { pathname },
      dashboard,
    } = this.props;
    let { children } = this.props;
    let empty = false;
    if (PROFILE_REGEX.test(pathname)) {
      empty = true;
    }

    if (enrollments.getStatus === FETCH_FAILURE) {
      children = <ErrorMessage errorInfo={enrollments.getErrorInfo} />;
      empty = true;
    }
    return <div id="app">
      <Navbar
        currentProgramEnrollment={currentProgramEnrollment}
        dashboard={dashboard}
        empty={empty}
        enrollDialogVisibility={enrollDialogVisibility}
        enrollSelectedProgram={enrollSelectedProgram}
        enrollments={enrollments}
        setCurrentProgramEnrollment={this.setCurrentProgramEnrollment}
        setEnrollDialogVisibility={this.setEnrollDialogVisibility}
        setEnrollSelectedProgram={this.setEnrollSelectedProgram}
      />
      <div className="page-content">
        { children }
      </div>
      <Footer />
    </div>;
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
    userProfile:              profile,
    dashboard:                state.dashboard,
    ui:                       state.ui,
    currentProgramEnrollment: state.currentProgramEnrollment,
    enrollments:              state.enrollments,
  };
};

export default connect(mapStateToProps)(App);

// @flow
/* global SETTINGS: false */
import React from 'react';
import Icon from 'react-mdl/lib/Icon';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import {
  TOAST_SUCCESS,
  TOAST_FAILURE,
} from '../constants';
import ErrorMessage from '../components/ErrorMessage';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import {
  FETCH_SUCCESS,
  FETCH_FAILURE,
  fetchDashboard,
  clearDashboard,
  fetchCoursePrices,
  clearCoursePrices,
} from '../actions';
import {
  fetchUserProfile,
  clearProfile,
  startProfileEdit,
  updateProfileValidation,
} from '../actions/profile';
import {
  addProgramEnrollment,
  clearEnrollments,
  fetchProgramEnrollments,
  setCurrentProgramEnrollment,
} from '../actions/enrollments';
import {
  setEnrollDialogError,
  setEnrollDialogVisibility,
  setToastMessage,
  setEnrollSelectedProgram,
} from '../actions/ui';
import { clearUI, setProfileStep } from '../actions/ui';
import { validateProfileComplete } from '../util/validation';
import type { DashboardState, CoursePricesState } from '../flow/dashboardTypes';
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
    prices:                   CoursePricesState,
    enrollments:              ProgramEnrollmentsState,
    history:                  Object,
    ui:                       UIState,
    signupDialog:             Object,
  };

  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  updateRequirements() {
    this.fetchUserProfile(SETTINGS.username);
    this.fetchDashboard();
    this.fetchCoursePrices();
    this.fetchEnrollments();
    this.requireProfileFilledOut();
    this.requireCompleteProfile();
  }

  componentDidMount() {
    this.updateRequirements();
  }

  componentDidUpdate() {
    this.updateRequirements();
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch(clearProfile(SETTINGS.username));
    dispatch(clearDashboard());
    dispatch(clearCoursePrices());
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

  fetchCoursePrices() {
    const { prices, dispatch } = this.props;
    if (prices.fetchStatus === undefined) {
      dispatch(fetchCoursePrices());
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

  addProgramEnrollment = (programId: number): void => {
    const { dispatch } = this.props;
    dispatch(addProgramEnrollment(programId));
  };

  setEnrollDialogError = (error: ?string): void => {
    const { dispatch } = this.props;
    dispatch(setEnrollDialogError(error));
  };

  setEnrollDialogVisibility = (visibility: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setEnrollDialogVisibility(visibility));
  };

  setEnrollSelectedProgram = (programId: ?number): void => {
    const { dispatch } = this.props;
    dispatch(setEnrollSelectedProgram(programId));
  };

  setCurrentProgramEnrollment = (enrollment: ProgramEnrollment): void => {
    const { dispatch } = this.props;
    dispatch(setCurrentProgramEnrollment(enrollment));
  };

  clearMessage = (): void => {
    const { dispatch } = this.props;
    dispatch(setToastMessage(null));
  };

  render() {
    const {
      currentProgramEnrollment,
      enrollments,
      ui: {
        enrollDialogError,
        enrollDialogVisibility,
        toastMessage,
        enrollSelectedProgram,
      },
      location: { pathname },
      dashboard
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

    let open = false;
    let message, title, icon;
    if (toastMessage) {
      open = true;

      if (toastMessage.icon === TOAST_FAILURE) {
        icon = <Icon name="error" key="icon "/>;
      } else if (toastMessage.icon === TOAST_SUCCESS) {
        icon = <Icon name="done" key="icon" />;
      }
      title = toastMessage.title;
      message = toastMessage.message;
    }

    return <div id="app">
      <Navbar
        addProgramEnrollment={this.addProgramEnrollment}
        currentProgramEnrollment={currentProgramEnrollment}
        dashboard={dashboard}
        empty={empty}
        enrollDialogError={enrollDialogError}
        enrollDialogVisibility={enrollDialogVisibility}
        enrollSelectedProgram={enrollSelectedProgram}
        enrollments={enrollments}
        setCurrentProgramEnrollment={this.setCurrentProgramEnrollment}
        setEnrollDialogError={this.setEnrollDialogError}
        setEnrollDialogVisibility={this.setEnrollDialogVisibility}
        setEnrollSelectedProgram={this.setEnrollSelectedProgram}
      />
      <Toast onTimeout={this.clearMessage} open={open}>
        {icon}
        <div className="body">
          <span className="title">{title}</span>
          <span className="message">{message}</span>
        </div>
      </Toast>
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
    prices:                   state.prices,
    ui:                       state.ui,
    currentProgramEnrollment: state.currentProgramEnrollment,
    enrollments:              state.enrollments,
    signupDialog:             state.signupDialog,
  };
};

export default connect(mapStateToProps)(App);

// @flow
/* global SETTINGS: false */
import React from 'react';
import _ from 'lodash';
import type { Dispatch } from 'redux';

import {
  startProfileEdit,
  updateProfile,
  updateProfileValidation,
  clearProfileEdit,
  fetchUserProfile,
  saveProfile,
} from '../actions/profile';
import {
  setWorkHistoryEdit,
  setWorkDialogVisibility,
  setWorkHistoryAnswer,
  setWorkDialogIndex,
  setEducationDialogVisibility,
  setEducationDialogIndex,
  setEducationDegreeLevel,
  setEducationLevelAnswers,
  setUserPageDialogVisibility,
  setShowEducationDeleteDialog,
  setShowWorkDeleteDialog,
  setDeletionIndex,
} from '../actions/ui';
import { setProgram } from '../actions/ui';
import { createSimpleActionHelpers, createAsyncActionHelpers } from '../lib/redux';
import type { ActionHelpers, AsyncActionHelpers } from '../lib/redux';
import type { Validator, UIValidator } from '../lib/validation/profile';
import type { Profile, Profiles, ProfileGetResult } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { DashboardState } from '../flow/dashboardTypes';
import type { Program } from '../flow/programTypes';
import { addProgramEnrollment } from '../actions/programs';

type UpdateProfile = (isEdit: boolean, profile: Profile, validator: Validator|UIValidator) => void;

class ProfileFormContainer extends React.Component {
  props: {
    profiles:    Profiles,
    children:    React$Element<*>[],
    dispatch:    Dispatch,
    history:     Object,
    ui:          UIState,
    params:      {[k: string]: string},
    dashboard:   DashboardState
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static mapStateToProps = state => {
    return {
      profiles: state.profiles,
      ui: state.ui,
      dashboard: state.dashboard,
    };
  };

  fetchProfile: Function = (username: string): void => {
    const { dispatch, profiles } = this.props;
    if (profiles[username] === undefined || profiles[username].getStatus === undefined) {
      dispatch(fetchUserProfile(username));
    }
  };

  updateProfileValidation(props: Object, profile: Profile, validator: Validator|UIValidator): void {
    const username = SETTINGS.username;
    const { dispatch, profiles, ui } = props;
    if ( profiles[username].edit && !_.isEmpty(profiles[username].edit.errors) ) {
      let errors = validator(profile, ui);
      dispatch(updateProfileValidation(username, errors));
    }
  }

  updateProfile: UpdateProfile = (isEdit, profile, validator) => {
    const { dispatch } = this.props;
    const username = SETTINGS.username;

    if (!isEdit) {
      dispatch(startProfileEdit(username));
    }
    dispatch(updateProfile(username, profile));
    this.updateProfileValidation(this.props, profile, validator);
  };

  saveProfile(isEdit: boolean, validator: Validator|UIValidator, profile: Profile, ui: UIState) {
    const { dispatch } = this.props;
    const username = SETTINGS.username;

    if (!isEdit) {
      // Validation errors will only show up if we start the edit
      dispatch(startProfileEdit(username));
    }
    let errors = validator(profile, ui);
    dispatch(updateProfileValidation(username, errors));
    if (_.isEmpty(errors)) {
      return dispatch(saveProfile(username, profile)).then(() => {
        dispatch(clearProfileEdit(username));
      });
    } else {
      // `setState` is being called here because we want to guarantee that
      // the callback executes after the `dispatch` call above. A callback
      // passed to `setState` executes when the component next re-renders.
      this.setState({}, () => {
        let invalidField = document.querySelector('.invalid-input');
        if ( invalidField !== null ) {
          invalidField.scrollIntoView();
        }
      });
      return Promise.reject(errors);
    }
  }

  setProgram = (program: Program): void => {
    const { dispatch } = this.props;
    dispatch(setProgram(program));
  }

  addProgramEnrollment = (programId: number): void => {
    const { dispatch } = this.props;
    dispatch(addProgramEnrollment(programId));
  };

  simpleActionHelpers: Function = (): ActionHelpers => {
    const { dispatch } = this.props;
    return createSimpleActionHelpers(dispatch, [
      ['setWorkDialogVisibility', setWorkDialogVisibility],
      ['setWorkHistoryAnswer', setWorkHistoryAnswer],
      ['setWorkDialogIndex', setWorkDialogIndex],
      ['clearProfileEdit', clearProfileEdit],
      ['setEducationDialogVisibility', setEducationDialogVisibility],
      ['setEducationDialogIndex', setEducationDialogIndex],
      ['setEducationDegreeLevel', setEducationDegreeLevel],
      ['setEducationLevelAnswers', setEducationLevelAnswers],
      ['setUserPageDialogVisibility', setUserPageDialogVisibility],
      ['setShowEducationDeleteDialog', setShowEducationDeleteDialog],
      ['setShowWorkDeleteDialog', setShowWorkDeleteDialog],
      ['setDeletionIndex', setDeletionIndex],
    ]);
  };

  asyncActionHelpers: Function = (): AsyncActionHelpers => {
    const { dispatch } = this.props;
    return createAsyncActionHelpers(dispatch, [
      ['setWorkHistoryEdit', setWorkHistoryEdit],
    ]);
  };

  profileProps: Function = (profileFromStore: ProfileGetResult) => {
    let {
      ui,
      dashboard,
      dispatch,
    } = this.props;
    let errors, isEdit, profile;

    if ( profileFromStore === undefined ) {
      profile = {};
      errors = {};
      isEdit = false;
    } else {
      if (profileFromStore.edit !== undefined) {
        errors = profileFromStore.edit.errors;
        profile = profileFromStore.edit.profile;
        isEdit = true;
      } else {
        profile = profileFromStore.profile;
        errors = {};
        isEdit = false;
      }
    }

    return {
      profile: profile,
      errors: errors,
      ui: ui,
      dispatch: dispatch,
      dashboard: dashboard,
      setProgram: this.setProgram,
      addProgramEnrollment: this.addProgramEnrollment,
      updateProfile: this.updateProfile.bind(this, isEdit),
      saveProfile: this.saveProfile.bind(this, isEdit),
      fetchProfile: this.fetchProfile,
      ...this.simpleActionHelpers(),
      ...this.asyncActionHelpers()
    };
  };

  childrenWithProps: Function = (profileFromStore: ProfileGetResult) => {
    return React.Children.map(this.props.children, (child) => (
      React.cloneElement(child, this.profileProps(profileFromStore))
    ));
  }
}

export default ProfileFormContainer;

// @flow
/* global SETTINGS: false */
import React from 'react';
import _ from 'lodash';
import type { Dispatch } from 'redux';
import R from 'ramda';

import {
  startProfileEdit,
  updateProfile,
  updateProfileValidation,
  clearProfileEdit,
  fetchUserProfile,
  saveProfile,
  updateValidationVisibility,
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
import type {
  AvailableProgram,
  AvailableProgramsState
} from '../flow/enrollmentTypes';
import type { Program } from '../flow/programTypes';
import { addProgramEnrollment } from '../actions/programs';
import { ALL_ERRORS_VISIBLE } from '../constants';

type UpdateProfile = (isEdit: boolean, profile: Profile, validator: Validator|UIValidator) => void;

class ProfileFormContainer extends React.Component {
  props: {
    profiles:    Profiles,
    children:    React$Element<*>[],
    dispatch:    Dispatch,
    history:     Object,
    ui:          UIState,
    params:      {[k: string]: string},
    programs:    AvailableProgramsState,
    currentProgramEnrollment: AvailableProgram,
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static mapStateToProps = state => {
    return {
      profiles: state.profiles,
      ui: state.ui,
      programs: state.programs,
      currentProgramEnrollment: state.currentProgramEnrollment
    };
  };

  fetchProfile: Function = (username: string): void => {
    const { dispatch, profiles } = this.props;
    if (profiles[username] === undefined || profiles[username].getStatus === undefined) {
      dispatch(fetchUserProfile(username));
    }
  };

  updateProfileValidation: Function = (profile: Profile, validator: Validator|UIValidator): void => {
    const username = SETTINGS.user.username;
    const { dispatch, ui } = this.props;
    let errors = validator(profile, ui);
    dispatch(updateProfileValidation(username, errors));
  }

  updateProfile: UpdateProfile = (isEdit, profile, validator, skipValidation = false) => {
    const { dispatch } = this.props;
    const username = SETTINGS.user.username;

    if (!isEdit) {
      dispatch(startProfileEdit(username));
    }
    dispatch(updateProfile(username, profile));
    if ( !skipValidation ) {
      this.updateProfileValidation(profile, validator);
    }
  };

  updateValidationVisibility: Function = keySet => {
    const { dispatch, profiles } = this.props;
    const username = SETTINGS.user.username;
    if ( !profiles[username].edit ) {
      dispatch(updateValidationVisibility(username, keySet));
    } else if ( !R.contains(keySet, profiles[username].edit.visibility) ) {
      dispatch(updateValidationVisibility(username, keySet));
    }
  };

  startProfileEdit: Function = () => {
    const { dispatch } = this.props;
    const username = SETTINGS.username;
    dispatch(startProfileEdit(username));
  };

  saveProfile(isEdit: boolean, validator: Validator|UIValidator, profile: Profile, ui: UIState) {
    const { dispatch } = this.props;
    const username = SETTINGS.user.username;

    if (!isEdit) {
      // Validation errors will only show up if we start the edit
      dispatch(startProfileEdit(username));
    }
    let errors = validator(profile, ui);
    this.updateValidationVisibility(ALL_ERRORS_VISIBLE);
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

  addProgramEnrollment = (programId: number): void => {
    const { dispatch } = this.props;
    dispatch(addProgramEnrollment(programId));
  };

  setProgram = (program: Program): void => {
    const { dispatch } = this.props;
    dispatch(setProgram(program));
  };

  simpleActionHelpers: Function = (): ActionHelpers => {
    const { dispatch } = this.props;
    return createSimpleActionHelpers(dispatch, [
      ['clearProfileEdit', clearProfileEdit],
      ['setDeletionIndex', setDeletionIndex],
      ['setEducationDegreeLevel', setEducationDegreeLevel],
      ['setEducationDialogIndex', setEducationDialogIndex],
      ['setEducationDialogVisibility', setEducationDialogVisibility],
      ['setEducationLevelAnswers', setEducationLevelAnswers],
      ['setShowEducationDeleteDialog', setShowEducationDeleteDialog],
      ['setShowWorkDeleteDialog', setShowWorkDeleteDialog],
      ['setUserPageDialogVisibility', setUserPageDialogVisibility],
      ['setWorkDialogIndex', setWorkDialogIndex],
      ['setWorkDialogVisibility', setWorkDialogVisibility],
      ['setWorkHistoryAnswer', setWorkHistoryAnswer],
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
      programs,
      dispatch,
      currentProgramEnrollment
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
      addProgramEnrollment: this.addProgramEnrollment,
      dispatch: dispatch,
      errors: errors,
      fetchProfile: this.fetchProfile,
      profile: profile,
      programs: programs.availablePrograms,
      saveProfile: this.saveProfile.bind(this, isEdit),
      currentProgramEnrollment: currentProgramEnrollment,
      setProgram: this.setProgram,
      startProfileEdit: this.startProfileEdit,
      ui: ui,
      updateProfile: this.updateProfile.bind(this, isEdit),
      updateProfileValidation: this.updateProfileValidation,
      updateValidationVisibility: this.updateValidationVisibility,
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

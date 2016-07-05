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
} from '../actions';
import {
  setWorkHistoryEdit,
  setWorkDialogVisibility,
  setWorkDialogIndex,
  setEducationDialogVisibility,
  setEducationDialogIndex,
  setEducationDegreeLevel,
  setEducationDegreeInclusions,
  setUserPageDialogVisibility,
  setShowEducationDeleteDialog,
  setShowWorkDeleteDialog,
  setDeletionIndex,
  setShowWorkDeleteAllDialog,
  setShowEducationDeleteAllDialog,
  setProfileStep,
} from '../actions/ui';
import type { Validator, UIValidator } from '../util/validation';
import type { Profile, Profiles, ProfileGetResult } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class ProfileFormContainer extends React.Component {
  props: {
    profiles:   Profiles,
    children:   React$Element[],
    dispatch:   Dispatch,
    history:    Object,
    ui:         UIState,
    params:     {[k: string]: string},
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static mapStateToProps = state => {
    return {
      profiles: state.profiles,
      ui: state.ui,
    };
  };

  fetchProfile: Function = (username: string): void => {
    const { dispatch, profiles } = this.props;
    if (profiles[username] === undefined || profiles[username].getStatus === undefined) {
      dispatch(fetchUserProfile(username));
    }
  }

  updateProfile: Function = (isEdit: boolean, profile: Profile): void => {
    const { dispatch } = this.props;
    const username = SETTINGS.username;

    if (!isEdit) {
      dispatch(startProfileEdit(username));
    }
    dispatch(updateProfile(username, profile));
  }

  setProfileStep: Function = (step: string): void => {
    const { dispatch } = this.props;
    dispatch(setProfileStep(step));
  };

  setDeletionIndex: Function = (index: number): void => {
    const { dispatch } = this.props;
    dispatch(setDeletionIndex(index));
  }

  setShowEducationDeleteDialog: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setShowEducationDeleteDialog(bool));
  }

  setShowWorkDeleteDialog: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setShowWorkDeleteDialog(bool));
  }

  setShowWorkDeleteAllDialog: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setShowWorkDeleteAllDialog(bool));
  };

  setShowEducationDeleteAllDialog: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setShowEducationDeleteAllDialog(bool));
  };

  setUserPageDialogVisibility: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setUserPageDialogVisibility(bool));
  }

  setWorkHistoryEdit: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setWorkHistoryEdit(bool));
  }

  setWorkDialogVisibility: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setWorkDialogVisibility(bool));
  }

  setWorkDialogIndex: Function = (index: number): void => {
    const { dispatch } = this.props;
    dispatch(setWorkDialogIndex(index));
  }

  clearProfileEdit: Function = (): void => {
    const { dispatch } = this.props;
    dispatch(clearProfileEdit(SETTINGS.username));
  }

  setEducationDialogVisibility: Function = (bool: boolean): void => {
    const { dispatch } = this.props;
    dispatch(setEducationDialogVisibility(bool));
  }

  setEducationDialogIndex: Function = (index: number): void => {
    const { dispatch } = this.props;
    dispatch(setEducationDialogIndex(index));
  }

  setEducationDegreeLevel: Function = (level: string): void => {
    const { dispatch } = this.props;
    dispatch(setEducationDegreeLevel(level));
  };

  setEducationDegreeInclusions: Function = (inclusions: Object): void => {
    const { dispatch } = this.props;
    dispatch(setEducationDegreeInclusions(inclusions));
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
      return Promise.reject(errors);
    }
  }

  profileProps: Function = (profileFromStore: ProfileGetResult) => {
    let { ui } = this.props;
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

    return Object.assign({}, {
      profile: profile,
      errors: errors,
      ui: ui,
      updateProfile: this.updateProfile.bind(this, isEdit),
      saveProfile: this.saveProfile.bind(this, isEdit),
      setWorkHistoryEdit: this.setWorkHistoryEdit,
      setWorkDialogVisibility: this.setWorkDialogVisibility,
      setWorkDialogIndex: this.setWorkDialogIndex,
      clearProfileEdit: this.clearProfileEdit,
      setEducationDialogVisibility: this.setEducationDialogVisibility,
      setEducationDialogIndex: this.setEducationDialogIndex,
      setEducationDegreeLevel: this.setEducationDegreeLevel,
      setEducationDegreeInclusions: this.setEducationDegreeInclusions,
      fetchProfile: this.fetchProfile,
      setUserPageDialogVisibility: this.setUserPageDialogVisibility,
      setShowEducationDeleteDialog: this.setShowEducationDeleteDialog,
      setShowWorkDeleteDialog: this.setShowWorkDeleteDialog,
      setDeletionIndex: this.setDeletionIndex,
      setShowWorkDeleteAllDialog: this.setShowWorkDeleteAllDialog,
      setShowEducationDeleteAllDialog: this.setShowEducationDeleteAllDialog
    });
  };

  childrenWithProps: Function = (profileFromStore: ProfileGetResult) => {
    return React.Children.map(this.props.children, (child) => (
      React.cloneElement(child, this.profileProps(profileFromStore))
    ));
  }
}

export default ProfileFormContainer;

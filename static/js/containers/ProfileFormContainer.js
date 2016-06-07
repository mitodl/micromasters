/* global SETTINGS: false */
import React from 'react';
import _ from 'lodash';

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
} from '../actions/ui';

class ProfileFormContainer extends React.Component {
  static propTypes = {
    profiles:   React.PropTypes.object,
    children:   React.PropTypes.node,
    dispatch:   React.PropTypes.func.isRequired,
    history:    React.PropTypes.object,
    ui:         React.PropTypes.object.isRequired,
    params:     React.PropTypes.object,
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static mapStateToProps = state => {
    return {
      profiles: state.profiles,
      ui: state.ui,
    };
  }

  fetchProfile = () => {
    const { dispatch, profiles, params: { username } } = this.props;
    if (profiles[username] === undefined || profiles[username].getStatus === undefined) {
      dispatch(fetchUserProfile(username));
    }
  };

  updateProfile(isEdit, profile) {
    const { dispatch } = this.props;
    const username = SETTINGS.username;

    if (!isEdit) {
      dispatch(startProfileEdit(username));
    }
    dispatch(updateProfile(username, profile));
  }

  setDeletionIndex = index => {
    const { dispatch } = this.props;
    dispatch(setDeletionIndex(index));
  }

  setShowEducationDeleteDialog = bool => {
    const { dispatch } = this.props;
    dispatch(setShowEducationDeleteDialog(bool));
  }

  setShowWorkDeleteDialog = bool => {
    const { dispatch } = this.props;
    dispatch(setShowWorkDeleteDialog(bool));
  }

  setUserPageDialogVisibility = bool => {
    const { dispatch } = this.props;
    dispatch(setUserPageDialogVisibility(bool));
  }

  setWorkHistoryEdit = (bool) => {
    const { dispatch } = this.props;
    dispatch(setWorkHistoryEdit(bool));
  }

  setWorkDialogVisibility = (bool) => {
    const { dispatch } = this.props;
    dispatch(setWorkDialogVisibility(bool));
  }

  setWorkDialogIndex = (index) => {
    const { dispatch } = this.props;
    dispatch(setWorkDialogIndex(index));
  }

  clearProfileEdit = () => {
    const { dispatch } = this.props;
    dispatch(clearProfileEdit(SETTINGS.username));
  }

  setEducationDialogVisibility = bool => {
    const { dispatch } = this.props;
    dispatch(setEducationDialogVisibility(bool));
  }

  setEducationDialogIndex = index => {
    const { dispatch } = this.props;
    dispatch(setEducationDialogIndex(index));
  }

  setEducationDegreeLevel = level => {
    const { dispatch } = this.props;
    dispatch(setEducationDegreeLevel(level));
  }

  setEducationDegreeInclusions = inclusions => {
    const { dispatch } = this.props;
    dispatch(setEducationDegreeInclusions(inclusions));
  }

  saveProfile(isEdit, validator, profile, ui) {
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

  childrenWithProps = profileFromStore => {
    let { ui } = this.props;
    let errors, isEdit, profile;

    if (profileFromStore.edit !== undefined) {
      errors = profileFromStore.edit.errors;
      profile = profileFromStore.edit.profile;
      isEdit = true;
    } else {
      profile = profileFromStore.profile;
      errors = {};
      isEdit = false;
    }

    return React.Children.map(this.props.children, (child) => (
      React.cloneElement(child, {
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
      })
    ));
  }
}

export default ProfileFormContainer;

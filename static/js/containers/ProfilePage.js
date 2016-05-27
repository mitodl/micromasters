/* global SETTINGS */
import React from 'react';
import { connect } from 'react-redux';

import {
  startProfileEdit,
  updateProfile,
  validateProfile,
  clearProfileEdit,
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
} from '../actions/ui';
import { getPreferredName } from '../util/util';
import Jumbotron from '../components/Jumbotron';
import { makeProfileProgressDisplay } from '../util/util';

class ProfilePage extends React.Component {
  static propTypes = {
    profile:    React.PropTypes.object.isRequired,
    children:   React.PropTypes.node,
    dispatch:   React.PropTypes.func.isRequired,
    history:    React.PropTypes.object.isRequired,
    ui:         React.PropTypes.object.isRequired,
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  updateProfile(isEdit, profile) {
    const { dispatch } = this.props;
    const username = SETTINGS.username;

    if (!isEdit) {
      dispatch(startProfileEdit(username));
    }
    dispatch(updateProfile(username, profile));
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

  saveProfile(isEdit, profile, requiredFields, messages) {
    const { dispatch } = this.props;
    const username = SETTINGS.username;

    if (!isEdit) {
      // Validation errors will only show up if we start the edit
      dispatch(startProfileEdit(username));
    }
    return dispatch(validateProfile(username, profile, requiredFields, messages)).then(() => {
      return dispatch(saveProfile(username, profile)).then(() => {
        dispatch(clearProfileEdit(username));
      });
    });
  }

  activeTab () {
    return this.props.route.childRoutes.findIndex( (route) => (
      route.path === this.props.location.pathname.split("/")[2]
    ));
  }

  render() {
    let { profile, ui } = this.props;
    let errors, isEdit;

    if (profile.edit !== undefined) {
      errors = profile.edit.errors;
      profile = profile.edit.profile;
      isEdit = true;
    } else {
      profile = profile.profile;
      errors = {};
      isEdit = false;
    }

    let childrenWithProps = React.Children.map(this.props.children, (child) => (
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
      })
    ));

    let text = `Welcome ${getPreferredName(profile)}, let's
    complete your enrollment to MIT MicroMaster’s.`;

    return <div className="card">
      <Jumbotron profile={profile} text={text}>
        <div className="card-copy">
          <div style={{textAlign: "center"}}>
            {makeProfileProgressDisplay(this.activeTab())}
          </div>
          <section>
            {this.props.children && childrenWithProps}
          </section>
        </div>
      </Jumbotron>
    </div>;
  }
}

const mapStateToProps = state => {
  let profile = {
    profile: {}
  };
  if (state.profiles[SETTINGS.username] !== undefined) {
    profile = state.profiles[SETTINGS.username];
  }
  return {
    profile: profile,
    ui: state.ui,
  };
};

export default connect(mapStateToProps)(ProfilePage);

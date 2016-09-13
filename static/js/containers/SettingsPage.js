// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from 'react-loader';

import { startProfileEdit } from '../actions/profile';
import { FETCH_PROCESSING } from '../actions/index';
import ProfileFormContainer from './ProfileFormContainer';
import PrivacyForm from '../components/PrivacyForm';
import ProfileProgressControls from '../components/ProfileProgressControls';
import { privacyValidation } from '../util/validation';

class SettingsPage extends ProfileFormContainer {
  componentWillMount() {
    this.startSettingsEdit();
  }

  startSettingsEdit() {
    const { dispatch } = this.props;
    dispatch(startProfileEdit(SETTINGS.username));
  }

  render() {
    const { profiles } = this.props;
    let props = Object.assign({}, this.profileProps(profiles[SETTINGS.username]), {
      nextStep: () => this.context.router.push('/dashboard'),
      prevStep: undefined
    });
    let loaded = false;
    let username = SETTINGS.username;

    if (profiles[username] !== undefined) {
      let profileFromStore = profiles[username];
      loaded = profileFromStore.getStatus !== FETCH_PROCESSING;
    }

    return (
      <Loader loaded={loaded}>
        <div className="single-column privacy-form">
          <h4 className="privacy-form-heading">Settings</h4>
          <PrivacyForm {...props} />
          <ProfileProgressControls
            nextBtnLabel="Save"
            {...props}
            isLastTab={true}
            validator={privacyValidation}
          />
        </div>
      </Loader>
    );
  }
}

export default connect(ProfileFormContainer.mapStateToProps)(SettingsPage);

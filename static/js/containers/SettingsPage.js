// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from 'react-loader';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import Jumbotron from '../components/Jumbotron';
import {
  startProfileEdit,
  FETCH_PROCESSING,
} from '../actions/index';
import ProfileFormContainer from './ProfileFormContainer';
import PrivacyForm from '../components/PrivacyForm';
import ProfileProgressControls from '../components/ProfileProgressControls';
import {
    combineValidators,
    privacyValidation,
} from '../util/validation';
import { getPreferredName } from '../util/util';

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
    let preferredName = getPreferredName(props.profile);

    if (profiles[username] !== undefined) {
      let profileFromStore = profiles[username];
      loaded = profileFromStore.getStatus !== FETCH_PROCESSING;
    }

    return (
      <Loader loaded={loaded}>
        <Jumbotron {...props} text={preferredName}>
          <div className="card-copy">
            <Grid className="profile-tab-grid privacy-form">
              <Cell col={12}>
                <PrivacyForm {...props} />
              </Cell>
              <Cell col={12}>
                <ProfileProgressControls
                  nextBtnLabel="Save"
                  {...props}
                  isLastTab={true}
                  validator={
                    combineValidators(privacyValidation)
                  }
                />
              </Cell>
            </Grid>
          </div>
        </Jumbotron>
      </Loader>
    );
  }
}

export default connect(ProfileFormContainer.mapStateToProps)(SettingsPage);

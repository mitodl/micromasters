// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import PrivacyForm from './PrivacyForm';
import ProfileProgressControls from './ProfileProgressControls';
import ProfileFormFields from '../util/ProfileFormFields';
import {
  combineValidators,
  personalValidation,
  educationValidation,
  employmentValidation,
  privacyValidation,
} from '../util/validation';
import type { Profile, BoundSaveProfile } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class PrivacyTab extends ProfileFormFields {
  props: {
    profile:        Profile,
    saveProfile:    BoundSaveProfile,
    updateProfile:  () => void,
    ui:             UIState,
    nextStep:       () => void,
    prevStep:       () => void,
  };

  render() {
    return (
      <div>
        <Grid className="profile-splash">
          <Cell col={12}>
            We care about your privacy.
          </Cell>
        </Grid>
        <Grid className="profile-tab-grid privacy-form">
          <Cell col={12}>
            <PrivacyForm {...this.props} />
          </Cell>
          <Cell col={12}>
            <ProfileProgressControls
              {...this.props}
              nextBtnLabel="I'm Done!"
              isLastTab={true}
              validator={
                combineValidators(
                  personalValidation,
                  educationValidation,
                  employmentValidation,
                  privacyValidation
                )
              }
            />
          </Cell>
        </Grid>
      </div>
    );
  }
}

export default PrivacyTab;

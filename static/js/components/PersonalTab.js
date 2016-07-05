// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import PersonalForm from './PersonalForm';
import ProfileProgressControls from './ProfileProgressControls';
import { personalValidation } from '../util/validation';
import type { Profile, BoundSaveProfile, ValidationErrors } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class PersonalTab extends React.Component {
  props: {
    profile:        Profile,
    errors:         ValidationErrors,
    saveProfile:    BoundSaveProfile,
    updateProfile:  () => void,
    ui:             UIState,
    nextStep:       () => void,
    prevStep:       () => void,
  };

  render() {
    return <div>
      <Grid className="profile-splash">
        <Cell col={12}>
          Please tell us more about yourself so you can participate in the MicroMasters
          community and qualify for your MicroMasters credential.
        </Cell>
      </Grid>
      <Grid className="profile-tab-grid">
        <Cell col={1} />
        <Cell col={10}>
          <PersonalForm {...this.props} />
        </Cell>
        <Cell col={1} />
        <Cell col={1} />
        <Cell col={10}>
          <ProfileProgressControls
            {...this.props}
            nextBtnLabel="Save and Continue"
            isLastTab={false}
            validator={personalValidation}
          />
        </Cell>
        <Cell col={1} />
      </Grid>
    </div>;
  }
}

export default PersonalTab;

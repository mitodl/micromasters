// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import ProfileProgressControls from './ProfileProgressControls';
import EducationForm from './EducationForm';
import {
  educationUiValidation,
  educationValidation,
  combineValidators,
} from '../util/validation';
import type { Profile, BoundSaveProfile } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class EducationTab extends React.Component {
  props: {
    nextStep:     () => void,
    prevStep:     () => void,
    profile:      Profile,
    ui:           UIState,
    saveProfile:  BoundSaveProfile,
  };

  render() {
    return <div>
      <Grid className="profile-splash">
        <Cell col={12}>
          Please tell us more about your educational background.
        </Cell>
      </Grid>
      <Grid className="profile-tab-grid">
        <Cell col={1}></Cell>
        <Cell col={10}>
          <EducationForm {...this.props} />
        </Cell>
        <Cell col={1}></Cell>
        <Cell col={1} />
        <Cell col={10}>
          <ProfileProgressControls
            {...this.props}
            nextBtnLabel="Save and Continue"
            isLastTab={false}
            validator={combineValidators(educationValidation, educationUiValidation)}
          />
        </Cell>
        <Cell col={1} />
      </Grid>
    </div>;
  }
}

export default EducationTab;

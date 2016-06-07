import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import ProfileProgressControls from './ProfileProgressControls';
import EducationForm from './EducationForm';
import {
  educationUiValidation,
  educationValidation,
  combineValidators,
} from '../util/validation';

class EducationTab extends React.Component {
  static propTypes = {
    saveProfile: React.PropTypes.func,
    profile: React.PropTypes.object,
    ui: React.PropTypes.object
  };
  
  render() {
    const { saveProfile, profile, ui } = this.props;
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
            prevUrl="/profile/personal"
            nextUrl="/profile/professional"
            saveProfile={saveProfile}
            profile={profile}
            ui={ui}
            validator={combineValidators(educationValidation, educationUiValidation)}
          />
        </Cell>
        <Cell col={1} />
      </Grid>
    </div>;
  }
}

export default EducationTab;

import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import PersonalForm from './PersonalForm';
import ProfileProgressControls from './ProfileProgressControls';

class PersonalTab extends React.Component {
  static propTypes = {
    profile:        React.PropTypes.object,
    errors:         React.PropTypes.object,
    saveProfile:    React.PropTypes.func,
    updateProfile:  React.PropTypes.func,
  };

  render() {
    const { saveProfile, profile } = this.props;
    return <div>
      <Grid className="profile-splash">
        <Cell col={12}>
          Please tell us more about yourself so you can participate in the MicroMaster’s
          community and qualify for your MicroMaster’s credential.
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
            nextUrl="/profile/education"
            profile={profile}
            saveProfile={saveProfile}
          />
        </Cell>
        <Cell col={1} />
      </Grid>
    </div>;
  }
}

export default PersonalTab;

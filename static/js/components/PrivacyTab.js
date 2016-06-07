import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import ProfileProgressControls from './ProfileProgressControls';
import ProfileFormFields from '../util/ProfileFormFields';

class PrivacyTab extends ProfileFormFields {
  static propTypes = {
    profile:        React.PropTypes.object,
    saveProfile:    React.PropTypes.func,
    updateProfile:  React.PropTypes.func
  };

  render() {
    const { saveProfile, profile } = this.props;
    return (
      <div>
        <Grid className="profile-splash">
          <Cell col={12}>
            We care about your privacy.
          </Cell>
        </Grid>
        <br/><br/>
        <Grid className="profile-tab-grid">
          <Cell col={12}>
            <span className="header-privacy-tab">Who can see your profile?</span>
            { this.boundRadioGroupField(['account_privacy'], '', this.privacyOptions) } <br />
          </Cell>
          <Cell col={12}>
            <ProfileProgressControls
              prevUrl="/profile/professional"
              nextUrl="/dashboard"
              isLastTab={true}
              saveProfile={saveProfile}
              profile={profile}
            />
          </Cell>
        </Grid>
      </div>
    );
  }
}

export default PrivacyTab;

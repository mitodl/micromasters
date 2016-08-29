// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card } from 'react-mdl/lib/Card';
import IconButton from 'react-mdl/lib/IconButton';

import ProfileImage from './ProfileImage';
import {
  getEmployer,
  getPreferredName,
  userPrivilegeCheck
} from '../util/util';
import type { Profile } from '../flow/profileTypes';

export default class UserInfoCard extends React.Component {
  props: {
    profile: Profile,
    toggleShowPersonalDialog: () => void
  };

  getCurrentWorkPlace: Function = (profile: Profile): string => {
    let companyName = "";
    if (!getEmployer(profile).isNothing) {
      companyName = getEmployer(profile).value;
    }
    return companyName;
  }

  render() {
    const { profile, toggleShowPersonalDialog } = this.props;

    return (
      <Card shadow={1} className="profile-form profile-form-center-card dashboard-user-card">
        <Grid className="profile-form-grid">
          <Cell col={12} className="edit-profile-holder">
            {userPrivilegeCheck(profile, () => <IconButton name="edit" onClick={toggleShowPersonalDialog}/>)}
          </Cell>
          <Cell col={4}>
            <ProfileImage profile={profile} editable={true} />
          </Cell>
          <Cell col={8}>
            <div className="profile-title">{getPreferredName(profile)}</div>
            <div className="profile-company-name">{this.getCurrentWorkPlace(profile)}</div>
            <div className="profile-email">
              <img src='/static/images/email.png' alt="Email image" className="email-icon"/>
              {profile.email}
            </div>
          </Cell>
        </Grid>
      </Card>
    );
  }
}

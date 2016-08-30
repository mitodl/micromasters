// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import { Card } from 'react-mdl/lib/Card';
import Icon from 'react-mdl/lib/Icon';
import IconButton from 'react-mdl/lib/IconButton';

import ProfileImage from './ProfileImage';
import {
  getEmployer,
  getPreferredName,
  userPrivilegeCheck
} from '../util/util';
import { mstr } from '../util/sanctuary';
import type { Profile } from '../flow/profileTypes';

export default class UserInfoCard extends React.Component {
  props: {
    profile: Profile,
    toggleShowPersonalDialog: () => void
  };

  render() {
    const { profile, toggleShowPersonalDialog } = this.props;

    return (
      <Card shadow={1} className="profile-form user-page">
        <Grid className="profile-form-grid">
          <Cell col={3}>
            <ProfileImage profile={profile} editable={true} />
          </Cell>
          <Cell col={8}>
            <div className="profile-title">{getPreferredName(profile)}</div>
            <div className="profile-company-name">{mstr(getEmployer(profile))}</div>
            <div>
              <Icon name="email" className="email-icon" />
              <span className="profile-email">{profile.email}</span>
            </div>
          </Cell>
          <Cell col={1}>
            <div className="edit-profile-holder">
              {userPrivilegeCheck(profile, () => <IconButton name="edit" onClick={toggleShowPersonalDialog}/>)}
            </div>
          </Cell>
        </Grid>
      </Card>
    );
  }
}

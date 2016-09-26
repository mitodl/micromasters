// @flow
import React from 'react';
import { Card } from 'react-mdl/lib/Card';
import Icon from 'react-mdl/lib/Icon';
import IconButton from 'react-mdl/lib/IconButton';

import ProfileImage from '../containers/ProfileImage';
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
        <div className="profile-form-row">
          <ProfileImage profile={profile} editable={true} />
          <div className="col user-info">
            <div className="profile-title">{getPreferredName(profile)}</div>
            <div className="profile-company-name">{mstr(getEmployer(profile))}</div>
            <div>
              <Icon name="email" className="email-icon" />
              <span className="profile-email">{profile.email}</span>
            </div>
          </div>
          <div className="edit-profile-holder">
            {userPrivilegeCheck(profile, () => <IconButton name="edit" onClick={toggleShowPersonalDialog}/>)}
          </div>
        </div>
      </Card>
    );
  }
}

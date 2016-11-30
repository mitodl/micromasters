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
import { mstr } from '../lib/sanctuary';
import type { Profile } from '../flow/profileTypes';

export default class UserInfoCard extends React.Component {
  props: {
    profile: Profile,
    toggleShowPersonalDialog: () => void,
    toggleShowAboutMeDialog: () => void,
  };

  email = (email: string): React$Element<*> => (
    <div>
      <Icon name="email" className="email-icon" />
      <span className="profile-email">{email}</span>
    </div>
  );

  renderAboutMeSection: Function = (
    profile: Profile, toggleShowAboutMeDialog: Function
  ): React$Element<*> => {
    let aboutMeContent = userPrivilegeCheck(
      profile,
      () => [
        <h3 key="heading">About Me</h3>,
        <div className="bio placeholder" key="bio-placeholder">
          Write something about yourself, so others can learn a bit about you.
        </div>
      ],
      null
    );
    if (profile.about_me) {
      aboutMeContent = [
        <h3 key="heading">About Me</h3>,
        <div className="bio" key="bio">{profile.about_me}</div>
      ];
    }

    return (
      <div className="profile-form-row">
        <div className="about-me">{aboutMeContent}</div>
        <div className="edit-about-me-holder">
          {
            userPrivilegeCheck(
              profile,
              () => <IconButton name="edit about me section" onClick={toggleShowAboutMeDialog}/>
            )
          }
        </div>
      </div>
    );
  }

  render() {
    const {
      profile,
      toggleShowPersonalDialog,
      toggleShowAboutMeDialog
    } = this.props;

    return (
      <Card shadow={1} className="profile-form user-page">
        <div className="profile-form-row">
          <ProfileImage profile={profile} editable={true} />
          <div className="col user-info">
            <div className="profile-title">{getPreferredName(profile)}</div>
            <div className="profile-company-name">{mstr(getEmployer(profile))}</div>
            { profile.email ? this.email(profile.email) : null }
          </div>
          <div className="edit-profile-holder">
            {userPrivilegeCheck(profile, () => (
              <IconButton name="edit personal information" onClick={toggleShowPersonalDialog}/>
            ))}
          </div>
        </div>
        {this.renderAboutMeSection(profile, toggleShowAboutMeDialog)}
      </Card>
    );
  }
}

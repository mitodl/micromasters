// @flow
import React from 'react';
import { Card } from 'react-mdl/lib/Card';
import Icon from 'react-mdl/lib/Icon';

import { getPreferredName, getEmployer } from '../util/util';
import ProfileImage from '../containers/ProfileImage';
import { mstr } from '../util/sanctuary';
import type { Profile } from '../flow/profileTypes';

const UserChip = ({ profile }: {profile: Profile}): React$Element<*> => (
  <Card className="user-chip">
    <div className="profile-info">
      <span className="name">
        { getPreferredName(profile) }
      </span>
      <span className="employer">
        { mstr(getEmployer(profile)) }
      </span>
      <a href={`/users/${profile.username}`} className="mm-minor-action">
        <Icon name="person" />
        <span>View profile</span>
      </a>
      </div>
    <ProfileImage profile={profile} />
  </Card>
);

export default UserChip;

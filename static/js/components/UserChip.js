// @flow
import React from 'react';
import { Card } from 'react-mdl/lib/Card';
import Icon from 'react-mdl/lib/Icon';

import { getPreferredName, getEmployer } from '../util/util';
import ProfileImage from './ProfileImage';
import { mstr } from '../util/sanctuary';
import type { Profile } from '../flow/profileTypes';

const UserChip = ({ profile }: {profile: Profile}): React$Element<*> => (
  <Card className="user-chip" shadow={2}>
    <ProfileImage profile={profile} />
    <div className="profile-info">
      <span className="name">
        { getPreferredName(profile) }
      </span>
      <span className="employer">
        { mstr(getEmployer(profile)) }
      </span>
      <a href={`/users/${profile.username}`} className="mm-minor-action">
        <span>View profile</span>
      </a>
      </div>
  </Card>
);

export default UserChip;

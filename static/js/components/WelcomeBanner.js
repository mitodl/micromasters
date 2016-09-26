// @flow
/* global SETTINGS: false */
import React from 'react';

import ProfileImage from '../containers/ProfileImage';
import { getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';

export default class WelcomeBanner extends React.Component {
  props: {
    profile:      Profile,
    text:         string,
    children?:    React$Element<*>[],
  };

  render() {
    const { profile } = this.props;
    return (
      <div className="welcome-banner">
        <ProfileImage profile={profile} editable={true} />
        <div className="banner-text">
          Hi
          <span className="bold">
            { ` ${getPreferredName(profile)}! ` }
          </span>
          Complete the sign up to enroll in the MITx
          MicroMasters program.
        </div>
      </div>
    ); 
  }
}

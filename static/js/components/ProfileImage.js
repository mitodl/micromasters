// @flow
/* global SETTINGS: false */
import React from 'react';

import { makeProfileImageUrl, getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';

export default class ProfileImage extends React.Component {
  props: {
    profile: Profile
  };

  render () {
    const { profile, editable } = this.props;
    const imageUrl = makeProfileImageUrl(profile);

    let img = (
      <img
        src={imageUrl}
        alt={`Profile image for ${getPreferredName(profile, false)}`}
        className="card-image"
      />
    );
    if (editable) {
      img = (
        <div className="avatar">
          <img
            src={imageUrl}
            alt={`Profile image for ${getPreferredName(profile, false)}`}
            className="card-image"
          />
          <span className="img">
            <img
              src='/static/images/camera.png'
              alt="Camera image for"
            />
          </span>
        </div>
      )
    }

    return img;
  }
}

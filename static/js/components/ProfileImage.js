// @flow
/* global SETTINGS: false */
import React from 'react';
import Icon from 'react-mdl/lib/Icon';

import { makeProfileImageUrl, getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';

export default class ProfileImage extends React.Component {
  props: {
    profile: Profile,
    editable: boolean
  };

  static defaultProps = {
    editable: false
  };

  cameraIcon: Function = (editable: bool): React$Element<*>|null => {
    return editable ? <span className="img"><Icon name="camera_alt" /></span> : null;
  }

  render () {
    const { profile, editable } = this.props;
    const imageUrl = makeProfileImageUrl(profile);

    return (
      <div className="avatar">
        <img
          src={imageUrl}
          alt={`Profile image for ${getPreferredName(profile, false)}`}
          className="card-image"
        />
        { this.cameraIcon(editable) }
      </div>
    );
  }
}

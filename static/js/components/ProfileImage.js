// @flow
/* global SETTINGS: false */
import React from 'react';

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

  cameraSvgImage: Function = (): React$Element<*> => {
    return (
      <svg fill="#FFFFFF" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="3.2"/>
        <path d={`M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 
          2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z`}/>
        <path d="M0 0h24v24H0z" fill="none"/>
      </svg>
    );
  }

  render () {
    const { profile, editable } = this.props;
    const imageUrl = makeProfileImageUrl(profile);
    const cameraIcon = editable => (
      editable ? <span className="img">{this.cameraSvgImage()}</span> : null
    );

    return (
      <div className="avatar">
        <img
          src={imageUrl}
          alt={`Profile image for ${getPreferredName(profile, false)}`}
          className="card-image"
        />
        { cameraIcon(editable) }
      </div>
    );
  }
}

// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Icon from 'react-mdl/lib/Icon';
import type { Dispatch } from 'redux';

import {
  makeProfileImageUrl,
  getPreferredName,
  userPrivilegeCheck,
} from '../util/util';
import type { Profile, ProfileFetchResponse } from '../flow/profileTypes';
import ProfileImageUploader from '../components/ProfileImageUploader';
import { createActionHelper } from '../lib/redux';
import { setPhotoDialogVisibility } from '../actions/ui';
import {
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  setPhotoError,
  updateUserPhoto,
} from '../actions/image_upload';
import { fetchUserProfile } from '../actions/profile';

const formatPhotoName = photo => (
  `${photo.name.replace(/\.\w*$/, '')}.jpg`
);

class ProfileImage extends React.Component {
  props: {
    afterImageUpload:     ?(o: ProfileFetchResponse) => void,
    clearPhotoEdit:       () => void,
    dispatch:             Dispatch,
    editable:             boolean,
    imageUpload:          Object,
    linkText:             string,
    photoDialogOpen:      boolean,
    profile:              Profile,
    setDialogVisibility:  (b: boolean) => void,
    setPhotoError:        (s: string) => void,
    showLink:             boolean,
    startPhotoEdit:       (p: File) => void,
    updatePhotoEdit:      (b: Blob) => void,
  };

  static defaultProps = {
    editable: false
  };

  updateUserPhoto = () => {
    const {
      profile: { username },
      imageUpload: { edit, photo },
      dispatch,
      clearPhotoEdit,
      setDialogVisibility,
      afterImageUpload,
    } = this.props;

    return dispatch(updateUserPhoto(username, edit, formatPhotoName(photo))).then(() => {
      clearPhotoEdit();
      setDialogVisibility(false);
      return this.fetchUserProfile().then(resp => {
        if ( afterImageUpload ) {
          afterImageUpload(resp);
        }
      });
    });
  };

  fetchUserProfile = () => {
    const { dispatch } = this.props;
    return dispatch(fetchUserProfile(SETTINGS.user.username));
  };

  cameraIcon = (): React$Element<*>|null => {
    const { setDialogVisibility, editable } = this.props;
    if ( editable ) {
      return (
        <button className="open-photo-dialog" onClick={() => setDialogVisibility(true)}>
          <Icon name="camera_alt" aria-hidden="true" />
          <span className="sr-only">Update user photo</span>
        </button>
      );
    } else {
      return null;
    }
  }

  openDialogLink = (): React$Element<*> => {
    const { linkText, setDialogVisibility } = this.props;
    return <a onClick={() => setDialogVisibility(true)}>
      { linkText }
    </a>;
  };

  render () {
    const { profile, showLink } = this.props;
    const imageUrl = makeProfileImageUrl(profile);

    return (
      <div className="profile-image">
        <div className="avatar">
          <ProfileImageUploader
            {...this.props}
            updateUserPhoto={this.updateUserPhoto}
          />
          <img
            src={imageUrl}
            alt={`Profile image for ${getPreferredName(profile, false)}`}
            className="card-image"
          />
          { userPrivilegeCheck(profile, this.cameraIcon) }
        </div>
        { showLink ? this.openDialogLink() : null }
      </div>
    );
  }
}

const mapStateToProps = state => ({
  photoDialogOpen: state.ui.photoDialogVisibility,
  imageUpload: state.imageUpload,
});

const mapDispatchToProps = dispatch => ({
  setDialogVisibility: createActionHelper(dispatch, setPhotoDialogVisibility),
  startPhotoEdit: createActionHelper(dispatch, startPhotoEdit),
  clearPhotoEdit: createActionHelper(dispatch, clearPhotoEdit),
  updatePhotoEdit: createActionHelper(dispatch, updatePhotoEdit),
  setPhotoError:  createActionHelper(dispatch, setPhotoError),
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(ProfileImage);

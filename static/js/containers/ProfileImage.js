// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import Icon from "@material-ui/core/Icon"
import type { Dispatch } from "redux"

import {
  makeProfileImageUrl,
  getPreferredName,
  userPrivilegeCheck
} from "../util/util"
import type { Profile } from "../flow/profileTypes"
import ProfileImageUploader from "../components/ProfileImageUploader"
import { createActionHelper } from "../lib/redux"
import {
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  setPhotoError,
  updateUserPhoto
} from "../actions/image_upload"
import { fetchUserProfile } from "../actions/profile"
import { showDialog, hideDialog } from "../actions/ui"

export const PROFILE_IMAGE_DIALOG = "PROFILE_IMAGE_DIALOG"

const formatPhotoName = photo => `${photo.name.replace(/\.\w*$/, "")}.jpg`

class ProfileImage extends React.Component {
  props: {
    clearPhotoEdit: () => void,
    dispatch: Dispatch,
    editable: boolean,
    imageUpload: Object,
    linkText: string,
    photoDialogOpen: boolean,
    profile: Profile,
    setPhotoError: (s: string) => void,
    showLink: boolean,
    startPhotoEdit: (p: File) => void,
    updatePhotoEdit: (b: Blob) => void,
    useSmall?: boolean
  }

  static defaultProps = {
    editable: false
  }

  updateUserPhoto = () => {
    const {
      profile: { username },
      imageUpload: { edit, photo },
      dispatch,
      clearPhotoEdit
    } = this.props

    return dispatch(
      updateUserPhoto(username, edit, formatPhotoName(photo))
    ).then(() => {
      clearPhotoEdit()
      this.setDialogVisibility(false)
      return this.fetchUserProfile()
    })
  }

  setDialogVisibility = (visibility: boolean) => {
    const { dispatch } = this.props
    if (visibility) {
      dispatch(showDialog(PROFILE_IMAGE_DIALOG))
    } else {
      dispatch(hideDialog(PROFILE_IMAGE_DIALOG))
    }
  }

  fetchUserProfile = () => {
    const { dispatch } = this.props
    return dispatch(fetchUserProfile(SETTINGS.user.username))
  }

  cameraIcon = (): React$Element<*> | null => {
    const { editable } = this.props
    if (editable) {
      return (
        <button
          className="open-photo-dialog"
          onClick={() => this.setDialogVisibility(true)}
        >
          <Icon aria-hidden="true">camera_alt</Icon>
          <span className="sr-only">Update user photo</span>
        </button>
      )
    } else {
      return null
    }
  }

  openDialogLink = (): React$Element<*> => {
    const { linkText } = this.props
    return <a onClick={() => this.setDialogVisibility(true)}>{linkText}</a>
  }

  render() {
    const { profile, showLink, useSmall } = this.props
    const imageUrl = makeProfileImageUrl(profile, useSmall)
    const imageSizeClass = useSmall ? "small" : "medium"

    return (
      <div className="profile-image">
        <div className="avatar">
          {userPrivilegeCheck(
            profile,
            <ProfileImageUploader
              {...this.props}
              updateUserPhoto={this.updateUserPhoto}
              setDialogVisibility={this.setDialogVisibility}
            />
          )}
          <img
            src={imageUrl}
            alt={`Profile image for ${getPreferredName(profile)}`}
            className={`rounded-profile-image ${imageSizeClass}`}
          />
          {userPrivilegeCheck(profile, this.cameraIcon)}
        </div>
        {showLink ? this.openDialogLink() : null}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  photoDialogOpen: state.ui.dialogVisibility[PROFILE_IMAGE_DIALOG] || false,
  imageUpload:     state.imageUpload
})

const mapDispatchToProps = dispatch => ({
  startPhotoEdit:  createActionHelper(dispatch, startPhotoEdit),
  clearPhotoEdit:  createActionHelper(dispatch, clearPhotoEdit),
  updatePhotoEdit: createActionHelper(dispatch, updatePhotoEdit),
  setPhotoError:   createActionHelper(dispatch, setPhotoError),
  dispatch:        dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProfileImage)

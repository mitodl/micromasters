// @flow
/* global SETTINGS: false */
import React from "react"
import Card from "@material-ui/core/Card"
import Icon from "@material-ui/core/Icon"
import IconButton from "@material-ui/core/IconButton"

import ProfileImage from "../containers/ProfileImage"
import { hasAnyStaffRole } from "../lib/roles"
import {
  getEmployer,
  getPreferredName,
  isProfileOfLoggedinUser,
  isNilOrBlank
} from "../util/util"
import { mstr } from "../lib/sanctuary"
import type { Profile } from "../flow/profileTypes"
import CardContent from "@material-ui/core/CardContent"

const showLegalNameIfStaff = profile => {
  return hasAnyStaffRole(SETTINGS.roles) ? (
    <div className="legal-name">{`(Legal name: ${profile.first_name} ${
      profile.last_name
    })`}</div>
  ) : null
}

const showIdIfStaff = profile => {
  return hasAnyStaffRole(SETTINGS.roles) ? (
    <div className="student-id">{`(Student Id: ${profile.student_id})`}</div>
  ) : null
}

export default class LearnerInfoCard extends React.Component {
  props: {
    profile: Profile,
    toggleShowPersonalDialog: () => void,
    toggleShowAboutMeDialog: () => void,
    openLearnerEmailComposer: () => void
  }

  isOwnProfilePage = (): boolean => isProfileOfLoggedinUser(this.props.profile)

  shouldShowEmailLink = (): boolean => {
    const { profile } = this.props

    return (
      profile.email_optin &&
      !isNilOrBlank(profile.email) &&
      !this.isOwnProfilePage() &&
      hasAnyStaffRole(SETTINGS.roles)
    )
  }

  renderAboutMeSection = (
    profile: Profile,
    toggleShowAboutMeDialog: Function
  ): React$Element<*> => {
    let aboutMeContent, aboutMeEditContent

    if (profile.about_me) {
      aboutMeContent = (
        <div className="about-me">
          <h3>About Me</h3>
          <div className="bio">{profile.about_me}</div>
        </div>
      )
    } else if (this.isOwnProfilePage()) {
      aboutMeContent = (
        <div className="about-me">
          <h3>About Me</h3>
          <div className="bio placeholder">
            Write something about yourself, so others can learn a bit about you.
          </div>
        </div>
      )
    }

    if (this.isOwnProfilePage()) {
      aboutMeEditContent = (
        <div className="edit-about-me-holder">
          <IconButton
            className="edit-about-me-button"
            onClick={toggleShowAboutMeDialog}
          >
            <Icon>edit</Icon>
          </IconButton>
        </div>
      )
    }

    return (
      <div className="profile-form-row">
        {aboutMeContent}
        {aboutMeEditContent}
      </div>
    )
  }

  renderEmailLink = (): ?React$Element<*> => {
    const { openLearnerEmailComposer } = this.props

    let emailLink
    if (this.shouldShowEmailLink()) {
      emailLink = (
        <button onClick={openLearnerEmailComposer} className="icon-button-link">
          <Icon name="email" aria-hidden="true" />
          <span>Send a Message</span>
        </button>
      )
    }
    return emailLink
  }

  render() {
    const {
      profile,
      toggleShowPersonalDialog,
      toggleShowAboutMeDialog
    } = this.props

    let personalInfoEditContent
    if (this.isOwnProfilePage()) {
      personalInfoEditContent = (
        <div className="edit-profile-holder">
          <IconButton
            onClick={toggleShowPersonalDialog}
            className="edit-personal-info-button"
          >
            <Icon>edit</Icon>
          </IconButton>
        </div>
      )
    }

    return (
      <Card shadow={1} className="card profile-form user-page">
        <CardContent>
          <div className="profile-form-row">
            <ProfileImage profile={profile} editable={true} />
            <div className="col user-info">
              <div className="profile-title">{getPreferredName(profile)}</div>
              {showLegalNameIfStaff(profile)}
              {showIdIfStaff(profile)}
              <div className="profile-company-name">
                {mstr(getEmployer(profile))}
              </div>
              {this.renderEmailLink()}
            </div>
            {personalInfoEditContent}
          </div>
          {this.renderAboutMeSection(profile, toggleShowAboutMeDialog)}
        </CardContent>
      </Card>
    )
  }
}

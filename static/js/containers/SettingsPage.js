// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import Loader from "../components/Loader"
import R from "ramda"

import { startProfileEdit } from "../actions/profile"
import { FETCH_PROCESSING } from "../actions/index"
import {
  profileFormContainer,
  mapStateToProfileProps
} from "./ProfileFormContainer"
import LeaveProgramWizard from "../components/LeaveProgramWizard"
import PrivacyForm from "../components/PrivacyForm"
import ProfileProgressControls from "../components/ProfileProgressControls"
import { privacyValidation } from "../lib/validation/profile"
import type { ProfileContainerProps } from "./ProfileFormContainer"

class SettingsPage extends React.Component<*, ProfileContainerProps, *> {
  componentDidMount() {
    this.startSettingsEdit()
  }

  startSettingsEdit() {
    const { dispatch } = this.props
    dispatch(startProfileEdit(SETTINGS.user.username))
  }

  render() {
    const { profiles, profileProps } = this.props
    const props = profileProps(profiles[SETTINGS.user.username])
    let loaded = false
    const username = SETTINGS.user.username

    if (profiles[username] !== undefined) {
      const profileFromStore = profiles[username]
      loaded = profileFromStore.getStatus !== FETCH_PROCESSING
    }

    return (
      <Loader loaded={loaded}>
        <div className="single-column privacy-form">
          <h4 className="privacy-form-heading">Settings</h4>
          <PrivacyForm {...props} validator={privacyValidation} />
          <LeaveProgramWizard {...props} />
          <ProfileProgressControls
            {...props}
            nextBtnLabel="Save"
            nextUrl="/dashboard"
            isLastTab={true}
            validator={privacyValidation}
          />
        </div>
      </Loader>
    )
  }
}
export default R.compose(
  connect(mapStateToProfileProps),
  profileFormContainer
)(SettingsPage)

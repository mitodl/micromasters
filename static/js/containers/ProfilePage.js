// @flow
/* global SETTINGS */
import React from "react"
import PropTypes from "prop-types"
import { connect } from "react-redux"
import R from "ramda"

import { FETCH_PROCESSING } from "../actions"
import Loader from "../components/Loader"
import ErrorMessage from "../components/ErrorMessage"
import {
  profileFormContainer,
  mapStateToProfileProps,
  childrenWithProps
} from "./ProfileFormContainer"
import { validateProfileComplete } from "../lib/validation/profile"
import type { Profile, ProfileGetResult } from "../flow/profileTypes"
import {
  makeProfileProgressDisplay,
  currentOrFirstIncompleteStep
} from "../util/util"
import type { ProfileContainerProps } from "./ProfileFormContainer"

class ProfilePage extends React.Component<*, ProfileContainerProps, *> {
  componentDidMount() {
    const { scrollToError } = this.props
    scrollToError.call(this)
  }

  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  componentDidUpdate() {
    const username = SETTINGS.user.username
    const {
      profiles: { [username]: profileInfo },
      ui: { profileStep },
      profileProps
    } = this.props

    if (
      profileStep !== null &&
      profileInfo !== undefined &&
      profileInfo.getStatus !== FETCH_PROCESSING
    ) {
      const { profile } = profileProps(profileInfo)

      const [, step] = validateProfileComplete(profile)
      const idealStep = currentOrFirstIncompleteStep(profileStep, step)
      if (profileStep !== idealStep) {
        this.context.router.push(`/profile/${idealStep}`)
      }
    }
  }

  renderContent(
    username: string,
    profileInfo: ProfileGetResult,
    profile: Profile,
    currentStep: ?string
  ) {
    const { children, profileProps } = this.props

    if (R.isNil(profileInfo)) {
      return ""
    }

    if (profileInfo.errorInfo !== undefined) {
      return <ErrorMessage errorInfo={profileInfo.errorInfo} />
    }

    return (
      <div>
        <div className="profile-pagination">
          {makeProfileProgressDisplay(currentStep)}
        </div>
        <section className="profile-form">
          {childrenWithProps(children, profileProps(profileInfo))}
        </section>
      </div>
    )
  }

  render() {
    const username = SETTINGS.user.username
    const {
      profiles: { [username]: profileInfo },
      ui: { profileStep },
      profileProps
    } = this.props
    const loaded =
      profileInfo !== undefined && profileInfo.getStatus !== FETCH_PROCESSING
    const { profile } = profileProps(profileInfo)

    return (
      <div className="single-column">
        <Loader loaded={loaded}>
          {this.renderContent(username, profileInfo, profile, profileStep)}
        </Loader>
      </div>
    )
  }
}

export default R.compose(
  connect(mapStateToProfileProps),
  profileFormContainer
)(ProfilePage)

// @flow
/* global SETTINGS:false */
import React from "react"
import PropTypes from "prop-types"

import SpinnerButton from "./SpinnerButton"
import { saveProfileStep } from "../util/profile_edit"
import { FETCH_PROCESSING } from "../actions"
import type { Profile, SaveProfileFunc } from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import type { Validator } from "../lib/validation/profile"
import { sendGAEvent } from "../lib/google_analytics"

export default class ProfileProgressControls extends React.Component {
  props: {
    addProgramEnrollment: (p: number) => void,
    isLastTab: boolean,
    nextBtnLabel: string,
    nextUrl?: string,
    prevUrl?: string,
    profile: Profile,
    profilePatchStatus: ?string,
    programIdForEnrollment?: ?number,
    saveProfile: SaveProfileFunc,
    ui: UIState,
    validator: Validator
  }

  stepBack = (): void => {
    const { prevUrl } = this.props
    this.context.router.push(prevUrl)
  }

  saveAndContinue = (): void => {
    const {
      nextUrl,
      isLastTab,
      validator,
      programIdForEnrollment,
      addProgramEnrollment
    } = this.props

    saveProfileStep
      .call(this, validator, isLastTab)
      .then(() => {
        if (programIdForEnrollment && addProgramEnrollment) {
          addProgramEnrollment(programIdForEnrollment)
        }

        if (isLastTab) {
          sendGAEvent("profile-form", "completed", SETTINGS.user.username)
        }
        this.context.router.push(nextUrl)
      })
      .catch(() => {
        /* Promise rejected due to validation error or API error */
      })
  }

  render() {
    const { nextUrl, prevUrl, nextBtnLabel, profilePatchStatus } = this.props

    const inFlight = profilePatchStatus === FETCH_PROCESSING
    let prevButton, nextButton
    if (prevUrl) {
      prevButton = (
        <button
          className="mdl-button gray-button go-back prev"
          onClick={this.stepBack}
        >
          <span>Go Back</span>
        </button>
      )
    }
    if (nextUrl) {
      nextButton = (
        <SpinnerButton
          component="button"
          spinning={inFlight}
          role="button"
          className="mdl-button next"
          onClick={this.saveAndContinue}
        >
          {nextBtnLabel}
        </SpinnerButton>
      )
    }
    return (
      <div className="profile-progress-controls">
        {prevButton}
        {nextButton}
      </div>
    )
  }

  static contextTypes = {
    router: PropTypes.object.isRequired
  }
}

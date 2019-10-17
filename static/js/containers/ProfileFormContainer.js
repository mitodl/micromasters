// @flow
/* global SETTINGS: false */
import React from "react"
import _ from "lodash"
import type { Dispatch } from "redux"
import R from "ramda"

import {
  startProfileEdit,
  updateProfile,
  updateProfileValidation,
  clearProfileEdit,
  fetchUserProfile,
  saveProfile,
  updateValidationVisibility
} from "../actions/profile"
import {
  setWorkHistoryEdit,
  setWorkDialogVisibility,
  setWorkHistoryAnswer,
  setWorkDialogIndex,
  setEducationDialogVisibility,
  setEducationDialogIndex,
  setEducationDegreeLevel,
  setEducationLevelAnswers,
  setLearnerPageDialogVisibility,
  setLearnerPageAboutMeDialogVisibility,
  setShowEducationDeleteDialog,
  setShowWorkDeleteDialog,
  setDeletionIndex
} from "../actions/ui"
import { setProgram } from "../actions/ui"
import {
  createSimpleActionHelpers,
  createAsyncActionHelpers
} from "../lib/redux"
import type { ActionHelpers, AsyncActionHelpers } from "../lib/redux"
import type { Validator, UIValidator } from "../lib/validation/profile"
import type { Profile, Profiles, ProfileGetResult } from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import type {
  AvailableProgram,
  AvailableProgramsState
} from "../flow/enrollmentTypes"
import type { Program } from "../flow/programTypes"
import { addProgramEnrollment } from "../actions/programs"
import { ALL_ERRORS_VISIBLE } from "../constants"
import { getDisplayName } from "../util/util"

type UpdateProfile = (
  isEdit: boolean,
  profile: Profile,
  validator: Validator | UIValidator
) => void

export const mapStateToProfileProps = R.pick([
  "profiles",
  "ui",
  "programs",
  "currentProgramEnrollment"
])

type ProfileContainerParentProps = {
  profiles: Profiles,
  children: React$Element<*>[],
  dispatch: Dispatch,
  history: Object,
  ui: UIState,
  params: { [k: string]: string },
  programs: AvailableProgramsState,
  currentProgramEnrollment: AvailableProgram
}

export type ProfileContainerProps = ProfileContainerParentProps & {
  profileProps: Function,
  scrollToError: () => void,
  fetchProfile: () => void
}

export const childrenWithProps = (children: any, props: Object) => {
  return React.Children.map(children, child => React.cloneElement(child, props))
}

export const profileFormContainer = (WrappedComponent: ReactClass<*>) => {
  class ProfileFormContainer extends React.Component<
    *,
    ProfileContainerParentProps,
    *
  > {
    fetchProfile = (username: string): void => {
      const { dispatch, profiles } = this.props
      if (
        profiles[username] === undefined ||
        profiles[username].getStatus === undefined
      ) {
        dispatch(fetchUserProfile(username))
      }
    }

    updateProfileValidation = (
      profile: Profile,
      validator: Validator | UIValidator
    ): void => {
      const username = SETTINGS.user.username
      const { dispatch, ui } = this.props
      const errors = validator(profile, ui)
      dispatch(updateProfileValidation(username, errors))
    }

    updateProfile: UpdateProfile = (
      isEdit,
      profile,
      validator,
      skipValidation = false
    ) => {
      const { dispatch } = this.props
      const username = SETTINGS.user.username

      if (!isEdit) {
        dispatch(startProfileEdit(username))
      }
      dispatch(updateProfile(username, profile))
      if (!skipValidation) {
        this.updateProfileValidation(profile, validator)
      }
    }

    updateValidationVisibility = (keySet: Array<string>) => {
      const { dispatch, profiles } = this.props
      const username = SETTINGS.user.username
      if (!profiles[username].edit) {
        dispatch(updateValidationVisibility(username, keySet))
      } else if (!R.contains(keySet, profiles[username].edit.visibility)) {
        dispatch(updateValidationVisibility(username, keySet))
      }
    }

    startProfileEdit = () => {
      const { dispatch } = this.props
      const username = SETTINGS.user.username
      dispatch(startProfileEdit(username))
    }

    saveProfile(
      isEdit: boolean,
      validator: Validator | UIValidator,
      profile: Profile,
      ui: UIState
    ) {
      const { dispatch } = this.props
      const username = SETTINGS.user.username

      if (!isEdit) {
        // Validation errors will only show up if we start the edit
        dispatch(startProfileEdit(username))
      }
      const errors = validator(profile, ui)
      this.updateValidationVisibility(ALL_ERRORS_VISIBLE)
      dispatch(updateProfileValidation(username, errors))
      if (_.isEmpty(errors)) {
        return dispatch(saveProfile(username, profile)).then(() => {
          dispatch(clearProfileEdit(username))
        })
      } else {
        this.scrollToError()
        return Promise.reject("Invalid profile value(s)")
      }
    }

    scrollToError() {
      // `setState` is being called here because we want to guarantee that
      // the callback executes on the next re-render. A callback
      // passed to `setState` executes when the component next re-renders.
      this.setState({}, () => {
        const invalidField = document.querySelector(".invalid-input")
        if (invalidField !== null) {
          invalidField.scrollIntoView()
        }
      })
    }

    addProgramEnrollment = (programId: number): void => {
      const { dispatch } = this.props
      dispatch(addProgramEnrollment(programId))
    }

    setProgram = (program: Program): void => {
      const { dispatch } = this.props
      dispatch(setProgram(program))
    }

    simpleActionHelpers = (): ActionHelpers => {
      const { dispatch } = this.props
      return createSimpleActionHelpers(dispatch, [
        ["clearProfileEdit", clearProfileEdit],
        ["setDeletionIndex", setDeletionIndex],
        ["setEducationDegreeLevel", setEducationDegreeLevel],
        ["setEducationDialogIndex", setEducationDialogIndex],
        ["setEducationDialogVisibility", setEducationDialogVisibility],
        ["setEducationLevelAnswers", setEducationLevelAnswers],
        ["setShowEducationDeleteDialog", setShowEducationDeleteDialog],
        ["setShowWorkDeleteDialog", setShowWorkDeleteDialog],
        ["setLearnerPageDialogVisibility", setLearnerPageDialogVisibility],
        [
          "setLearnerPageAboutMeDialogVisibility",
          setLearnerPageAboutMeDialogVisibility
        ],
        ["setWorkDialogIndex", setWorkDialogIndex],
        ["setWorkDialogVisibility", setWorkDialogVisibility],
        ["setWorkHistoryAnswer", setWorkHistoryAnswer]
      ])
    }

    asyncActionHelpers = (): AsyncActionHelpers => {
      const { dispatch } = this.props
      return createAsyncActionHelpers(dispatch, [
        ["setWorkHistoryEdit", setWorkHistoryEdit]
      ])
    }

    profileProps: Function = (profileFromStore: ProfileGetResult) => {
      const { ui, programs, dispatch, currentProgramEnrollment } = this.props
      let errors, isEdit, profile, uneditedProfile, patchStatus

      if (profileFromStore === undefined) {
        profile = {}
        uneditedProfile = {}
        errors = {}
        isEdit = false
      } else {
        patchStatus = profileFromStore.patchStatus
        if (profileFromStore.edit !== undefined) {
          errors = profileFromStore.edit.errors
          profile = profileFromStore.edit.profile
          uneditedProfile = profileFromStore.profile
          isEdit = true
        } else {
          profile = profileFromStore.profile
          uneditedProfile = profileFromStore.profile
          errors = {}
          isEdit = false
        }
      }

      return {
        addProgramEnrollment:       this.addProgramEnrollment,
        dispatch:                   dispatch,
        errors:                     errors,
        fetchProfile:               this.fetchProfile,
        profile:                    profile,
        profilePatchStatus:         patchStatus,
        uneditedProfile:            uneditedProfile,
        programs:                   programs.availablePrograms,
        saveProfile:                this.saveProfile.bind(this, isEdit),
        currentProgramEnrollment:   currentProgramEnrollment,
        setProgram:                 this.setProgram,
        startProfileEdit:           this.startProfileEdit,
        ui:                         ui,
        updateProfile:              this.updateProfile.bind(this, isEdit),
        updateProfileValidation:    this.updateProfileValidation,
        updateValidationVisibility: this.updateValidationVisibility,
        ...this.simpleActionHelpers(),
        ...this.asyncActionHelpers()
      }
    }

    render() {
      return (
        <WrappedComponent
          {...this.props}
          profileProps={this.profileProps}
          fetchProfile={this.fetchProfile}
          scrollToError={this.scrollToError}
        />
      )
    }
  }

  ProfileFormContainer.displayName = `ProfileFormContainer(${getDisplayName(
    WrappedComponent
  )})`
  return ProfileFormContainer
}

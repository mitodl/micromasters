// @flow
/* global SETTINGS: false */
import React from "react"
import PropTypes from "prop-types"
import Icon from "@material-ui/core/Icon"
import { connect } from "react-redux"
import type { Dispatch } from "redux"

import { TOAST_FAILURE } from "../constants"
import ErrorMessage from "../components/ErrorMessage"
import Navbar from "../components/Navbar"
import Toast from "../components/Toast"
import { FETCH_SUCCESS, FETCH_FAILURE } from "../actions"
import {
  fetchUserProfile,
  clearProfile,
  startProfileEdit
} from "../actions/profile"
import {
  addProgramEnrollment,
  clearEnrollments,
  fetchProgramEnrollments,
  setCurrentProgramEnrollment
} from "../actions/programs"
import {
  setEnrollProgramDialogError,
  setEnrollProgramDialogVisibility,
  setToastMessage,
  setEnrollSelectedProgram,
  setNavDrawerOpen,
  clearUI
} from "../actions/ui"
import { validateProfileComplete } from "../lib/validation/profile"
import { currentOrFirstIncompleteStep } from "../util/util"
import type {
  AvailableProgram,
  AvailableProgramsState
} from "../flow/enrollmentTypes"
import type { ProfileGetResult } from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"

const PROFILE_REGEX = /^\/profile\/?[a-z]?/
const LEARNER_REGEX = /^\/learner\/?[a-z]?/

class App extends React.Component {
  props: {
    children: React$Element<*>[],
    userProfile: ProfileGetResult,
    location: Object,
    currentProgramEnrollment: AvailableProgram,
    dispatch: Dispatch,
    programs: AvailableProgramsState,
    history: Object,
    ui: UIState,
    signupDialog: Object,
    shareDialog: Object
  }

  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  updateRequirements() {
    if (SETTINGS.user) {
      this.fetchUserProfile(SETTINGS.user.username)
    }
    this.fetchEnrollments()
  }

  componentDidMount() {
    this.updateRequirements()
  }

  componentDidUpdate(prevProps) {
    const {
      location: { pathname },
      userProfile: { profile }
    } = this.props

    this.updateRequirements()

    const [complete] = validateProfileComplete(profile)
    if (
      (!complete || !profile.filled_out) &&
      !PROFILE_REGEX.test(prevProps.location.pathname) &&
      PROFILE_REGEX.test(pathname)
    ) {
      // user was redirected from somewhere to the profile
      this.showProfileNagToast()
    }
  }

  componentWillUnmount() {
    const { dispatch } = this.props
    const username = SETTINGS.user ? SETTINGS.user.username : null
    dispatch(clearProfile(username))
    dispatch(clearUI())
    dispatch(clearEnrollments())
  }

  fetchUserProfile = (username: string) => {
    const {
      userProfile,
      dispatch,
      location: { pathname }
    } = this.props
    if (userProfile.getStatus === undefined) {
      dispatch(fetchUserProfile(username)).then(() => {
        if (PROFILE_REGEX.test(pathname)) {
          dispatch(startProfileEdit(SETTINGS.user.username))
        }
      })
    }
    this.requireCompleteProfile()
  }

  requireCompleteProfile() {
    const {
      userProfile,
      userProfile: { profile },
      location: { pathname },
      ui: { profileStep }
    } = this.props
    const [complete, step] = validateProfileComplete(profile)
    const idealStep = currentOrFirstIncompleteStep(profileStep, step)
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      !PROFILE_REGEX.test(pathname) &&
      (!complete || !profile.filled_out)
    ) {
      this.context.router.push(`/profile/${idealStep}`)
    }
  }

  showProfileNagToast = () => {
    const { dispatch } = this.props
    dispatch(
      setToastMessage({
        message:
          "We need to know a little bit more about you. Please complete your profile.",
        icon: TOAST_FAILURE
      })
    )
  }

  fetchEnrollments() {
    const { programs, dispatch } = this.props
    if (programs.getStatus === undefined && SETTINGS.user) {
      dispatch(fetchProgramEnrollments())
    }
  }

  addProgramEnrollment = (programId: number): Promise<*> => {
    const { dispatch } = this.props
    return dispatch(addProgramEnrollment(programId))
  }

  setEnrollProgramDialogError = (error: ?string): void => {
    const { dispatch } = this.props
    dispatch(setEnrollProgramDialogError(error))
  }

  setEnrollProgramDialogVisibility = (visibility: boolean): void => {
    const { dispatch } = this.props
    dispatch(setEnrollProgramDialogVisibility(visibility))
  }

  setEnrollSelectedProgram = (programId: ?number): void => {
    const { dispatch } = this.props
    dispatch(setEnrollSelectedProgram(programId))
  }

  setCurrentProgramEnrollment = (enrollment: AvailableProgram): void => {
    const { dispatch } = this.props
    dispatch(setCurrentProgramEnrollment(enrollment))
  }

  clearMessage = (): void => {
    const { dispatch } = this.props
    dispatch(setToastMessage(null))
  }

  setNavDrawerOpen = (bool: boolean): void => {
    const { dispatch } = this.props
    dispatch(setNavDrawerOpen(bool))
  }

  renderToast() {
    const {
      ui: { toastMessage }
    } = this.props
    if (!toastMessage) {
      return null
    }

    const {
      icon: iconName,
      title: titleText,
      message: messageText
    } = toastMessage

    let icon
    if (iconName) {
      icon = <Icon name={iconName} key="icon" />
    }

    let title, message
    if (titleText) {
      title = <h1>{titleText}</h1>
    }
    if (messageText) {
      message = <p>{messageText}</p>
    }

    return (
      <Toast onTimeout={this.clearMessage}>
        <div className="toast-message">
          {icon}
          <div className="toast-body">
            {title}
            {message}
          </div>
        </div>
      </Toast>
    )
  }

  render() {
    const {
      currentProgramEnrollment,
      programs,
      ui: {
        enrollProgramDialogError,
        enrollProgramDialogVisibility,
        enrollSelectedProgram,
        navDrawerOpen
      },
      location: { pathname },
      userProfile: { profile }
    } = this.props
    let { children } = this.props
    let empty = false
    if (PROFILE_REGEX.test(pathname)) {
      empty = true
    }

    if (programs.getStatus === FETCH_FAILURE && !LEARNER_REGEX.test(pathname)) {
      children = <ErrorMessage errorInfo={programs.getErrorInfo} />
      empty = true
    }

    return (
      <div id="app">
        <Navbar
          addProgramEnrollment={this.addProgramEnrollment}
          currentProgramEnrollment={currentProgramEnrollment}
          empty={empty}
          enrollProgramDialogError={enrollProgramDialogError}
          enrollProgramDialogVisibility={enrollProgramDialogVisibility}
          enrollSelectedProgram={enrollSelectedProgram}
          pathname={pathname}
          programs={programs.availablePrograms}
          fetchAddStatus={programs.postStatus}
          setCurrentProgramEnrollment={this.setCurrentProgramEnrollment}
          setEnrollProgramDialogError={this.setEnrollProgramDialogError}
          setEnrollProgramDialogVisibility={
            this.setEnrollProgramDialogVisibility
          }
          setEnrollSelectedProgram={this.setEnrollSelectedProgram}
          setNavDrawerOpen={this.setNavDrawerOpen}
          navDrawerOpen={navDrawerOpen}
          profile={profile}
        />
        {this.renderToast()}
        <div className="page-content">{children}</div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  const user = SETTINGS.user
  let profile = {
    profile: {}
  }
  if (user && state.profiles[user.username] !== undefined) {
    profile = state.profiles[user.username]
  }
  return {
    userProfile:              profile,
    ui:                       state.ui,
    currentProgramEnrollment: state.currentProgramEnrollment,
    programs:                 state.programs,
    courseEnrollments:        state.courseEnrollments,
    signupDialog:             state.signupDialog,
    shareDialog:              state.shareDialog
  }
}

export default connect(mapStateToProps)(App)

// @flow
/* global SETTINGS: false */
import React from "react"
import { Link } from "react-router"
import Icon from "@material-ui/core/Icon"
import IconButton from "@material-ui/core/IconButton"
import { ReactPageClick } from "react-page-click"
import Swipeable from "react-swipeable"
import R from "ramda"

import type {
  AvailableProgram,
  AvailablePrograms
} from "../flow/enrollmentTypes"
import ProgramSelector from "./ProgramSelector"
import ProfileImage from "../containers/ProfileImage"
import { getPreferredName } from "../util/util"
import type { Profile } from "../flow/profileTypes"
import {
  hasAnyStaffRole,
  firstFinancialAidProgram,
  hasEditAbility
} from "../lib/roles"

const PROFILE_SETTINGS_REGEX = /^\/profile\/?|settings\/?|learner\/[a-z]?/
const PROFILE_REGEX = /^\/profile\/?/

const externalLink = (path, label, newTab) => (
  <a target={newTab ? "_blank" : ""} href={path}>
    {label}
  </a>
)

const reactLink = (closeDrawer, path, label) => (
  <Link to={path} onClick={closeDrawer}>
    {label}
  </Link>
)

const navLink = (
  onClick,
  path,
  label,
  iconName,
  external = false,
  newTab = false
) => (
  <div className="link">
    <Icon aria-hidden="true">{iconName}</Icon>
    {external
      ? externalLink(path, label, newTab)
      : reactLink(onClick, path, label)}
    {newTab ? <Icon name="open_in_new" aria-hidden="true" /> : null}
  </div>
)

const adminLink = (...args) =>
  hasAnyStaffRole(SETTINGS.roles) ? navLink(...args) : null

const learnerLink = (...args) =>
  hasAnyStaffRole(SETTINGS.roles) ? null : navLink(...args)

const financialAidLink = (...args) =>
  R.find(hasEditAbility, SETTINGS.roles) ? navLink(...args) : null

export default class Navbar extends React.Component {
  props: {
    addProgramEnrollment: (programId: number) => Promise<*>,
    children?: React$Element<*>[],
    currentProgramEnrollment: AvailableProgram,
    empty: boolean,
    enrollProgramDialogError: ?string,
    enrollProgramDialogVisibility: boolean,
    enrollSelectedProgram: ?number,
    fetchAddStatus?: string,
    programs: AvailablePrograms,
    navDrawerOpen: boolean,
    pathname: string,
    profile: Profile,
    setCurrentProgramEnrollment: (program: AvailableProgram) => void,
    setEnrollProgramDialogError: (error: ?string) => void,
    setEnrollProgramDialogVisibility: (open: boolean) => void,
    setEnrollSelectedProgram: (programId: ?number) => void,
    setNavDrawerOpen: (b: boolean) => void
  }

  renderProfileHeader = () => [
    <img
      src="/static/images/mit-logo-transparent.svg"
      alt="MIT"
      key="header-logo"
    />,
    <span className="mdl-layout-title profile-header" key="header-text">
      MITx MicroMasters Programs
    </span>
  ]

  renderAuthenticatedHeader = (link: string) => [
    <Link to={link} key="header-logo-link">
      <img src="/static/images/mit-logo-transparent.svg" alt="MIT" />
    </Link>,
    <span className="mdl-layout-title" key="header-text-link">
      <Link to={link}>MITx MicroMasters Programs</Link>
    </span>
  ]

  renderUnauthenticatedHeader = (link: string) => [
    <a href={link} key="header-logo-link">
      <img src="/static/images/mit-logo-transparent.svg" alt="MIT" />
    </a>,
    <span className="mdl-layout-title" key="header-text-link">
      <a href={link}>MITx MicroMasters Programs</a>
    </span>
  ]

  programSelector = (): React$Element<*> => {
    const {
      enrollProgramDialogError,
      enrollProgramDialogVisibility,
      setEnrollProgramDialogError,
      setEnrollProgramDialogVisibility,
      pathname
    } = this.props
    return (
      <ProgramSelector
        {...this.props}
        enrollDialogError={enrollProgramDialogError}
        enrollDialogVisibility={enrollProgramDialogVisibility}
        setEnrollDialogError={setEnrollProgramDialogError}
        setEnrollDialogVisibility={setEnrollProgramDialogVisibility}
        selectorVisibility={!PROFILE_SETTINGS_REGEX.test(pathname)}
      />
    )
  }

  navDrawer = (drawerClass: string): React$Element<*> | null => {
    if (!SETTINGS.user) {
      return null
    }

    const { profile, setNavDrawerOpen, navDrawerOpen } = this.props

    const closeDrawer = () => {
      if (navDrawerOpen) {
        setNavDrawerOpen(false)
      }
    }

    return (
      <Swipeable onSwipedLeft={closeDrawer}>
        <ReactPageClick notify={closeDrawer}>
          <div className={drawerClass}>
            <div className="profile-info">
              <div className="row">
                <Link
                  to={`/learner/${SETTINGS.user.username}`}
                  onClick={closeDrawer}
                >
                  <ProfileImage profile={profile} />
                </Link>
                <IconButton onClick={closeDrawer} className="icon-button">
                  <Icon>chevron_left</Icon>
                </IconButton>
              </div>
              <div className="name">
                {reactLink(
                  closeDrawer,
                  `/learner/${SETTINGS.user.username}`,
                  getPreferredName(profile)
                )}
              </div>
              {this.programSelector()}
            </div>
            <div className="links">
              {adminLink(closeDrawer, "/learners", "Learners", "people")}
              {adminLink(closeDrawer, "/cms", "CMS", "description", true, true)}
              {financialAidLink(
                closeDrawer,
                `/financial_aid/review/${firstFinancialAidProgram(
                  SETTINGS.roles
                )}`,
                "Personal Price Admin",
                "attach_money",
                true,
                true
              )}
              {adminLink(
                closeDrawer,
                "/automaticemails",
                "Email Campaigns",
                "email"
              )}
              {learnerLink(closeDrawer, "/dashboard", "Dashboard", "dashboard")}
              {navLink(
                closeDrawer,
                `/learner/${SETTINGS.user.username}`,
                "My Profile",
                "person"
              )}
              {navLink(closeDrawer, "/settings", "Settings", "settings")}
            </div>
            <div className="logout-link">
              {navLink(null, "/logout", "Logout", "exit_to_app", true)}
            </div>
          </div>
        </ReactPageClick>
      </Swipeable>
    )
  }

  renderMenu = (
    setNavDrawerOpen: (b: boolean) => void
  ): React$Element<*> | null =>
    SETTINGS.user ? (
      <div className="mobile-visible">
        <Icon className="menu-icon" onClick={() => setNavDrawerOpen(true)}>
          menu
        </Icon>
      </div>
    ) : null

  render() {
    const { navDrawerOpen, setNavDrawerOpen, pathname } = this.props

    let link = "/"
    if (SETTINGS.user) {
      link = "/dashboard"
    }
    if (hasAnyStaffRole(SETTINGS.roles)) {
      link = "/learners"
    }

    let header = null
    if (PROFILE_REGEX.test(pathname)) {
      header = this.renderProfileHeader()
    } else {
      header = SETTINGS.user
        ? this.renderAuthenticatedHeader(link)
        : this.renderUnauthenticatedHeader(link)
    }

    const drawerClass = `nav-drawer ${navDrawerOpen ? "open" : "closed"}`
    return (
      <div className="micromasters-navbar">
        <div className="mobile-visible">{this.navDrawer(drawerClass)}</div>
        <header className="micromasters-nav">
          <div className="micromasters-header">
            <div className="micromasters-title">
              {this.renderMenu(setNavDrawerOpen)}
              {header}
            </div>
            <div className="desktop-visible">{this.programSelector()}</div>
          </div>
        </header>
      </div>
    )
  }
}

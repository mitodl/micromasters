// @flow
/* global SETTINGS: false */
import React from 'react';
import { Link } from 'react-router';
import { Header, HeaderRow } from 'react-mdl';
import Icon from 'react-mdl/lib/Icon';
import { ReactPageClick } from 'react-page-click';
import Swipeable from 'react-swipeable';
import R from 'ramda';

import type {
  AvailableProgram,
  AvailablePrograms,
} from '../flow/enrollmentTypes';
import ProgramSelector from './ProgramSelector';
import UserMenu from '../containers/UserMenu';
import ProfileImage from '../containers/ProfileImage';
import { getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';

const PROFILE_SETTINGS_REGEX = /^\/profile\/?|settings\/?|learner\/[a-z]?/;
const PROFILE_REGEX = /^\/profile\/?/;

export default class Navbar extends React.Component {
  props: {
    addProgramEnrollment:        (programId: number) => void,
    children?:                   React$Element<*>[],
    currentProgramEnrollment:    AvailableProgram,
    empty:                       boolean,
    enrollDialogError:           ?string,
    enrollDialogVisibility:      boolean,
    enrollSelectedProgram:       ?number,
    programs:                    AvailablePrograms,
    navDrawerOpen:               boolean,
    pathname:                    string,
    profile:                     Profile,
    setCurrentProgramEnrollment: (program: AvailableProgram) => void,
    setEnrollDialogError:        (error: ?string) => void,
    setEnrollDialogVisibility:   (open: boolean) => void,
    setEnrollSelectedProgram:    (programId: ?number) => void,
    setNavDrawerOpen:            (b: boolean) => void,
    setPhotoDialogVisibility:    (b: boolean) => void,
  };

  renderProfileHeader = () => ([
    <img src="/static/images/mit-logo-transparent.svg" alt="MIT" key="header-logo"/>,
    <span className="mdl-layout-title profile-header" key="header-text">MITx MicroMasters</span>
  ]);

  renderNormalHeader = (link: string) => ([
    <Link to={link} key="header-logo-link"><img src="/static/images/mit-logo-transparent.svg" alt="MIT" /></Link>,
    <span className="mdl-layout-title" key="header-text-link"><Link to={link}>MITx MicroMasters</Link></span>
  ]);

  userMenu: Function = (): void|React$Element<*> => {
    const { empty } = this.props;
    return empty === true ? undefined : <UserMenu />;
  };

  programSelector: Function = (): React$Element<*> => {
    const { pathname } = this.props;
    return (
      <ProgramSelector
        {...this.props}
        selectorVisibility={!PROFILE_SETTINGS_REGEX.test(pathname)}
      />
    );
  };

  navDrawer: Function = (drawerClass: string): React$Element<*>|null => {
    if (!SETTINGS.user) {
      return null;
    }

    const {
      profile,
      setNavDrawerOpen,
      setPhotoDialogVisibility,
      navDrawerOpen,
    } = this.props;

    const closeDrawer = () => {
      if ( navDrawerOpen ) {
        setNavDrawerOpen(false);
      }
    };

    return (
      <Swipeable onSwipedLeft={closeDrawer}>
        <ReactPageClick notify={closeDrawer}>
          <div className={drawerClass}>
            <div className="profile-info">
              <ProfileImage profile={profile} />
              <div className="name">
                { getPreferredName(profile) }
              </div>
              { this.programSelector() }
            </div>
            <div className="links">
              <div className="link">
                <Icon name="dashboard" aria-hidden="true" />
                <Link to="/dashboard" onClick={closeDrawer} >
                  Dashboard
                </Link>
              </div>
              <div className="link">
                <Icon name="person" aria-hidden="true" />
                <Link to={`/learner/${SETTINGS.user.username}`}
                  onClick={closeDrawer} >
                  View Profile
                </Link>
              </div>
              <div className="link">
                <Icon name="camera_alt" aria-hidden="true" />
                <button onClick={R.compose(() => setPhotoDialogVisibility(true), closeDrawer)}>
                  Edit Photo
                </button>
              </div>
              <div className="link">
                <Icon name="settings" aria-hidden="true" />
                <Link to="/settings" onClick={closeDrawer} >
                  Settings
                </Link>
              </div>
            </div>
            <div className="logout-link">
              <div className="link">
                <Icon name="exit_to_app" aria-hidden="true" />
                <a href="/logout">
                  Logout
                </a>
              </div>
            </div>
          </div>
        </ReactPageClick>
      </Swipeable>
    );
  };


  render () {
    const {
      navDrawerOpen,
      setNavDrawerOpen,
      pathname
    } = this.props;

    let link = '/dashboard';
    if (SETTINGS.roles.find(role => role.role === 'staff' || role.role === 'instructor')) {
      link = '/learners';
    }

    let drawerClass = `nav-drawer ${navDrawerOpen ? 'open' : 'closed'}`;
    return (
      <div className="micromasters-navbar">
        <div className="mobile-visible">
          { this.navDrawer(drawerClass) }
        </div>
        <Header className="micromasters-nav">
          <HeaderRow className="micromasters-header">
            <div className="micromasters-title">
              <div className="mobile-visible">
                <Icon name="menu" onClick={() => setNavDrawerOpen(true)} />
              </div>
              { PROFILE_REGEX.test(pathname) ? this.renderProfileHeader() : this.renderNormalHeader(link) }
              <div className="desktop-visible">
                { this.programSelector() }
              </div>
            </div>
            <div className="desktop-visible">
              { this.userMenu() }
            </div>
          </HeaderRow>
        </Header>
      </div>
    );
  }
}

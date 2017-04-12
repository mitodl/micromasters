// @flow
/* global SETTINGS: false */
import React from 'react';
import { Link } from 'react-router';
import { Header, HeaderRow } from 'react-mdl';
import Icon from 'react-mdl/lib/Icon';
import IconButton from 'react-mdl/lib/IconButton';
import { ReactPageClick } from 'react-page-click';
import Swipeable from 'react-swipeable';
import R from 'ramda';

import type {
  AvailableProgram,
  AvailablePrograms,
} from '../flow/enrollmentTypes';
import ProgramSelector from './ProgramSelector';
import ProfileImage from '../containers/ProfileImage';
import { getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';
import {
  hasAnyStaffRole,
  firstFinancialAidProgram,
  hasEditAbility,
} from '../lib/roles';

const PROFILE_SETTINGS_REGEX = /^\/profile\/?|settings\/?|learner\/[a-z]?/;
const PROFILE_REGEX = /^\/profile\/?/;

const externalLink = (path, label, newTab) => (
  <a target={newTab ? "_blank" : ""} href={path}>
    { label }
  </a>
);

const reactLink = (closeDrawer, path, label) => (
  <Link to={path} onClick={closeDrawer}>
    { label }
  </Link>
);

const navLink = (onClick, path, label, iconName, external = false, newTab = false) => (
  <div className="link">
    <Icon name={iconName} aria-hidden="true" />
    { external ? externalLink(path, label, newTab) : reactLink(onClick, path, label) }
    { newTab ? <Icon name="open_in_new" aria-hidden="true" /> : null }
  </div>
);

const adminLink = (...args) => (
  hasAnyStaffRole(SETTINGS.roles) ? navLink(...args) : null
);

const learnerLink = (...args) => (
  hasAnyStaffRole(SETTINGS.roles) ? null : navLink(...args)
);

const financialAidLink = (...args) => (
  R.find(hasEditAbility, SETTINGS.roles) ? navLink(...args) : null
);

export default class Navbar extends React.Component {
  props: {
    addProgramEnrollment:             (programId: number) => Promise<*>,
    children?:                        React$Element<*>[],
    currentProgramEnrollment:         AvailableProgram,
    empty:                            boolean,
    enrollProgramDialogError:         ?string,
    enrollProgramDialogVisibility:    boolean,
    enrollSelectedProgram:            ?number,
    fetchAddStatus?:                  string,
    programs:                         AvailablePrograms,
    navDrawerOpen:                    boolean,
    pathname:                         string,
    profile:                          Profile,
    setCurrentProgramEnrollment:      (program: AvailableProgram) => void,
    setEnrollProgramDialogError:      (error: ?string) => void,
    setEnrollProgramDialogVisibility: (open: boolean) => void,
    setEnrollSelectedProgram:         (programId: ?number) => void,
    setNavDrawerOpen:                 (b: boolean) => void,
    setPhotoDialogVisibility:         (b: boolean) => void,
  };

  renderProfileHeader = () => ([
    <img src="/static/images/mit-logo-transparent.svg" alt="MIT" key="header-logo"/>,
    <span className="mdl-layout-title profile-header" key="header-text">MITx MicroMasters</span>
  ]);

  renderNormalHeader = (link: string) => ([
    <Link to={link} key="header-logo-link"><img src="/static/images/mit-logo-transparent.svg" alt="MIT" /></Link>,
    <span className="mdl-layout-title" key="header-text-link"><Link to={link}>MITx MicroMasters</Link></span>
  ]);

  programSelector = (): React$Element<*> => {
    const {
      enrollProgramDialogError,
      enrollProgramDialogVisibility,
      setEnrollProgramDialogError,
      setEnrollProgramDialogVisibility,
      pathname,
    } = this.props;
    return (
      <ProgramSelector
        {...this.props}
        enrollDialogError={enrollProgramDialogError}
        enrollDialogVisibility={enrollProgramDialogVisibility}
        setEnrollDialogError={setEnrollProgramDialogError}
        setEnrollDialogVisibility={setEnrollProgramDialogVisibility}
        selectorVisibility={!PROFILE_SETTINGS_REGEX.test(pathname)}
      />
    );
  };

  navDrawer = (drawerClass: string): React$Element<*>|null => {
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
      if (navDrawerOpen) {
        setNavDrawerOpen(false);
      }
    };

    return (
      <Swipeable onSwipedLeft={closeDrawer}>
        <ReactPageClick notify={closeDrawer}>
          <div className={drawerClass}>
            <div className="profile-info">
              <div className="row">
                <ProfileImage profile={profile} />
                <IconButton name="chevron_left" onClick={closeDrawer} className="no-hover-styling" />
              </div>
              <div className="name">
                { getPreferredName(profile) }
              </div>
              { this.programSelector() }
            </div>
            <div className="links">
              { adminLink(closeDrawer, '/learners', 'Learners', 'people') }
              { adminLink(closeDrawer, '/cms', 'CMS',  'description', true, true) }
              { financialAidLink(
                closeDrawer,
                `/financial_aid/review/${firstFinancialAidProgram(SETTINGS.roles)}`,
                'Personal Price Admin',
                'attach_money',
                true,
                true
              )}
              { adminLink(closeDrawer, '/automaticemails', 'Email Campaigns', 'email') }
              { learnerLink(closeDrawer, '/dashboard', 'Dashboard', 'dashboard') }
              { navLink(closeDrawer, `/learner/${SETTINGS.user.username}`, 'My Profile', 'person')}
              { navLink(
                R.compose(() => setPhotoDialogVisibility(true), closeDrawer),
                null,
                'Edit Photo',
                'camera_alt'
              )}
              { navLink(closeDrawer, '/settings', 'Settings', 'settings') }
            </div>
            <div className="logout-link">
              { navLink(null, '/logout', 'Logout', 'exit_to_app', true) }
            </div>
          </div>
        </ReactPageClick>
      </Swipeable>
    );
  };

  renderMenu = (setNavDrawerOpen: (b: boolean) => void): React$Element<*>|null => (
    SETTINGS.user ? (
      <div className="mobile-visible">
        <Icon name="menu" className="menu-icon" onClick={() => setNavDrawerOpen(true)} />
      </div>
    ) : null
  );

  render () {
    const {
      navDrawerOpen,
      setNavDrawerOpen,
      pathname
    } = this.props;

    let link = '/dashboard';
    if (hasAnyStaffRole(SETTINGS.roles)) {
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
              { this.renderMenu(setNavDrawerOpen) }
              { PROFILE_REGEX.test(pathname) ? this.renderProfileHeader() : this.renderNormalHeader(link) }
            </div>
            <div className="desktop-visible">
              { this.programSelector() }
            </div>
          </HeaderRow>
        </Header>
      </div>
    );
  }
}

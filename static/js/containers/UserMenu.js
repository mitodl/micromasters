// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import { Icon } from 'react-mdl';
import { Link } from 'react-router';
import { ReactPageClick } from 'react-page-click';
import type { Dispatch } from 'redux';

import { getPreferredName } from '../util/util';
import { createActionHelper } from '../util/redux';
import { setUserMenuOpen } from '../actions/ui';
import ProfileImage from '../containers/ProfileImage';
import type { Profile } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class UserMenu extends React.Component {
  props: {
    profile:  Profile,
    dispatch: Dispatch,
    ui:       UIState,
  };

  openStateIcon: Function = (): React$Element<*> => {
    const { ui: { userMenuOpen } } = this.props;
    return <Icon name={`${userMenuOpen ? "arrow_drop_up" : "arrow_drop_down"}`} />;
  };

  toggleMenuOpen: Function = (): void => {
    const { ui: { userMenuOpen }, dispatch } = this.props;
    const setMenuOpenState = createActionHelper(dispatch, setUserMenuOpen);
    setMenuOpenState(!userMenuOpen);
  };

  linkMenu: Function = (): React$Element<*> => {
    const { profile, ui: { userMenuOpen } } = this.props;
    return (
      <div className={`user-menu-dropdown ${userMenuOpen ? "open" : ""}`}>
        <Link to={`/users/${profile.username}`}>
          View Profile
        </Link>
        <Link to="/settings">
          Settings
        </Link>
        <a href="/logout">
          Logout
        </a>
      </div>
    );
  };


  render() {
    const { profile, ui: { userMenuOpen } } = this.props;
    // span tags are a workaround for weird indentation with react-bootstrap
    // and React 15. React 15 removed span tags but react-bootstrap still expects
    // them.
    let title = <span>
      {getPreferredName(profile)}
    </span>;

    if (SETTINGS.authenticated) {
      let menuContents = <div className="user-menu" onClick={this.toggleMenuOpen}>
        <ProfileImage profile={profile} />
        { title }
        { this.openStateIcon() }
        { this.linkMenu() }
      </div>;

      if ( userMenuOpen ) {
        return (
          <ReactPageClick notify={this.toggleMenuOpen}>
            { menuContents }
          </ReactPageClick>
        );
      } else {
        return menuContents;
      }
    } else {
      return (
        <div className="user-menu no-auth">
          <a href="/login/edxorg/">Sign in with edX.org</a>
        </div>
      );
    }
  }
}

const mapStateToProps = (state) => {
  let profile = {};
  if (state.profiles[SETTINGS.username] !== undefined) {
    profile = state.profiles[SETTINGS.username].profile;
  }
  return {
    profile:  profile,
    ui:       state.ui
  };
};

export default connect(mapStateToProps)(UserMenu);

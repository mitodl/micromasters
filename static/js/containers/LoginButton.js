// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import SplitButton from 'react-bootstrap/lib/SplitButton';
import LinkContainer from 'react-router-bootstrap/lib/LinkContainer';
import MenuItem from 'react-bootstrap/lib/MenuItem';

import { getPreferredName } from '../util/util';

class LoginButton extends React.Component {
  static propTypes = {
    dispatch: React.PropTypes.func.isRequired,
    profile:  React.PropTypes.object.isRequired,
  };

  render() {
    const { profile } = this.props;

    // span tags are a workaround for weird indentation with react-bootstrap
    // and React 15. React 15 removed span tags but react-bootstrap still expects
    // them.
    let title = <span>
      {getPreferredName(profile)}
    </span>;

    if (SETTINGS.authenticated) {
      return (
        <LinkContainer to={{ pathname: '/dashboard' }} active={false}>
          <SplitButton
            title={title}
            bsStyle="danger"
            id="logout-button">
            <LinkContainer to={{ pathname: '/settings' }} active={false}>
              <MenuItem>
                Settings
              </MenuItem>
            </LinkContainer>
            <MenuItem
              href="/logout"
              eventKey="logout">
              Logout
            </MenuItem>
          </SplitButton>
        </LinkContainer>
      );
    } else {
      return <div className="pull-right">
        <span>Get Started Today!</span>
        <a className="btn btn-danger" href="/login/edxorg/">Sign in with edX.org</a>
      </div>;
    }
  }
}

const mapStateToProps = (state) => {
  let profile = {};
  if (state.profiles[SETTINGS.username] !== undefined) {
    profile = state.profiles[SETTINGS.username].profile;
  }
  return {
    profile: profile
  };
};

export default connect(mapStateToProps)(LoginButton);

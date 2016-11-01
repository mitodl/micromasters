// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Loader from 'react-loader';

import { FETCH_PROCESSING } from '../actions';
import { clearProfile } from '../actions/profile';
import ProfileFormContainer from './ProfileFormContainer';
import ErrorMessage from '../components/ErrorMessage';

class UserPage extends ProfileFormContainer {
  componentDidMount() {
    const { params: { username } } = this.props;
    this.fetchProfile(username);
  }

  componentDidUpdate() {
    const { params: { username } } = this.props;
    this.fetchProfile(username);
  }

  componentWillUnmount() {
    const { dispatch, params: { username } } = this.props;
    if (SETTINGS.user.username !== username) {
      // don't erase the user's own profile from the state
      dispatch(clearProfile(username));
    }
  }

  render() {
    const { params: { username }, profiles } = this.props;

    let profile = {};
    let loaded = false;
    if (profiles[username] !== undefined) {
      profile = profiles[username];
      loaded = profiles[username].getStatus !== FETCH_PROCESSING;
    }
    const { errorInfo } = profile;
    return <Loader loaded={loaded}>
      {errorInfo && loaded ? <ErrorMessage errorInfo={errorInfo} /> : this.childrenWithProps(profile)}
    </Loader>;
  }
}

export default connect(ProfileFormContainer.mapStateToProps)(UserPage);

/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import Dialog from 'material-ui/Dialog';

import Header from '../components/Header';
import {
  FETCH_SUCCESS,
  fetchUserProfile,
  clearProfile,
  fetchDashboard,
  clearDashboard,
} from '../actions/index';
import {
  clearUI,
  updateDialogText,
  updateDialogTitle,
  setDialogVisibility,
} from '../actions/ui';
import { validateProfileComplete } from '../util/util';

const TERMS_OF_SERVICE_REGEX = /\/terms_of_service\/?/;
const PROFILE_REGEX = /^\/profile\/?[a-z]?/;

class App extends React.Component {
  static propTypes = {
    children:     React.PropTypes.object.isRequired,
    userProfile:  React.PropTypes.object.isRequired,
    dashboard:    React.PropTypes.object.isRequired,
    dispatch:     React.PropTypes.func.isRequired,
    history:      React.PropTypes.object.isRequired,
    ui:           React.PropTypes.object.isRequired,
  };

  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  componentDidMount() {
    this.fetchUserProfile(SETTINGS.username);
    this.fetchDashboard();
    this.requireTermsOfService();
    this.requireProfileFilledOut();
    this.requireCompleteProfile();
  }

  componentDidUpdate() {
    this.fetchUserProfile(SETTINGS.username);
    this.fetchDashboard();
    this.requireTermsOfService();
    this.requireProfileFilledOut();
    this.requireCompleteProfile();
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch(clearProfile(SETTINGS.username));
    dispatch(clearDashboard());
    dispatch(clearUI());
  }

  fetchUserProfile(username) {
    const { userProfile, dispatch } = this.props;
    if (userProfile.getStatus === undefined) {
      dispatch(fetchUserProfile(username));
    }
  }

  fetchDashboard() {
    const { dashboard, dispatch } = this.props;
    if (dashboard.fetchStatus === undefined) {
      dispatch(fetchDashboard());
    }
  }

  requireTermsOfService() {
    const { userProfile, location: { pathname } } = this.props;
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      !userProfile.profile.agreed_to_terms_of_service &&
      !(TERMS_OF_SERVICE_REGEX.test(pathname))
    ) {
      this.context.router.push('/terms_of_service');
    }
  }

  requireProfileFilledOut() {
    const { userProfile, location: { pathname } } = this.props;
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      !userProfile.profile.filled_out &&
      !(TERMS_OF_SERVICE_REGEX.test(pathname)) &&
      !(PROFILE_REGEX.test(pathname))
    ) {
      this.context.router.push('/profile');
    }
  }

  requireCompleteProfile() {
    const {
      userProfile,
      userProfile: { profile },
      location: { pathname },
      dispatch,
    } = this.props;
    let [ complete, info ] = validateProfileComplete(profile);
    if (
      userProfile.getStatus === FETCH_SUCCESS &&
      profile.agreed_to_terms_of_service &&
      !PROFILE_REGEX.test(pathname) &&
      !complete
    ) {
      const { url, title, text } = info;
      dispatch(updateDialogText(text));
      dispatch(updateDialogTitle(title));
      dispatch(setDialogVisibility(true));
      this.context.router.push(url);
    }
  }

  dialogHelper () {
    const { ui, dispatch } = this.props;
    let visible = _.get(ui, ['dialog', 'visible'], false);
    let text = _.get(ui, ['dialog', 'text']);
    let title = _.get(ui, ['dialog', 'title']);
    let close = () => dispatch(setDialogVisibility(false));
    let actions = [
      <div
        role='button'
        key="close"
        onClick={close}
        className="mdl-button mdl-js-button"
      >
        close
      </div>
    ];
    return (
      <Dialog
        open={visible}
        onRequestClose={close}
        title={title}
        actions={actions}
        autoScrollBodyContent={true}
        className="dashboard-dialog"
      >
        {text !== undefined ? text : ""}
      </Dialog>
    );
  }

  render() {
    const { children, location: { pathname } } = this.props;

    let empty = false;
    if (TERMS_OF_SERVICE_REGEX.test(pathname)) {
      empty = true;
    }

    return (
      <div className="app-media layout-boxed">
        <Header empty={empty} />
        {this.dialogHelper()}
        <div className="main-content">
          {children}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  let profile = {
    profile: {}
  };
  if (state.profiles[SETTINGS.username] !== undefined) {
    profile = state.profiles[SETTINGS.username];
  }
  return {
    userProfile:  profile,
    dashboard:    state.dashboard,
    ui:           state.ui,
  };
};

export default connect(mapStateToProps)(App);

// @flow
/* global SETTINGS */
import React from 'react';
import { connect } from 'react-redux';
import R from 'ramda';

import { FETCH_PROCESSING } from '../actions';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import ProfileFormContainer from './ProfileFormContainer';
import { validateProfileComplete } from '../lib/validation/profile';
import type { Profile, ProfileGetResult } from '../flow/profileTypes';
import {
  makeProfileProgressDisplay,
  currentOrFirstIncompleteStep,
} from '../util/util';

class ProfilePage extends ProfileFormContainer {
  componentDidUpdate() {
    const username = SETTINGS.user.username;
    const {
      profiles: {
        [username]: profileInfo,
      },
      ui: { profileStep },
    } = this.props;

    if (profileStep !== null &&
        profileInfo !== undefined &&
        profileInfo.getStatus !== FETCH_PROCESSING) {
      const { profile } = this.profileProps(profileInfo);

      const [ , step, ] = validateProfileComplete(profile);
      let idealStep = currentOrFirstIncompleteStep(profileStep, step);
      if (profileStep !== idealStep) {
        this.context.router.push(`/profile/${idealStep}`);
      }
    }
  }

  renderContent(username: string, profileInfo: ProfileGetResult, profile: Profile, currentStep: ?string) {
    if (R.isNil(profileInfo)) {
      return '';
    }

    if (profileInfo.errorInfo !== undefined) {
      return <ErrorMessage errorInfo={profileInfo.errorInfo} />;
    }

    return (
      <div>
        <div className="profile-pagination">
          {makeProfileProgressDisplay(currentStep)}
        </div>
        <section className="profile-form">
          {this.childrenWithProps(profileInfo)}
        </section>
      </div>
    );
  }


  render() {
    const username = SETTINGS.user.username;
    const {
      profiles: {
        [username]: profileInfo,
      },
      ui: { profileStep }
    } = this.props;
    const loaded = profileInfo !== undefined &&
        profileInfo.getStatus !== FETCH_PROCESSING;
    const { profile } = this.profileProps(profileInfo);

    return (
      <div className="single-column">
        <Loader loaded={loaded}>
          {this.renderContent(username, profileInfo, profile, profileStep)}
        </Loader>
      </div>
    );
  }
}

export default connect(ProfileFormContainer.mapStateToProps)(ProfilePage);

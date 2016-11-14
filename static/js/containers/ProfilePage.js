// @flow
/* global SETTINGS */
import React from 'react';
import { connect } from 'react-redux';
import ReactDOM from 'react-dom';

import Loader from '../components/Loader';
import { makeProfileProgressDisplay } from '../util/util';
import { FETCH_PROCESSING } from '../actions';
import { setProfileStep } from '../actions/ui';
import WelcomeBanner from '../components/WelcomeBanner';
import ErrorMessage from '../components/ErrorMessage';
import ProfileFormContainer from './ProfileFormContainer';
import PersonalTab from '../components/PersonalTab';
import EmploymentTab from '../components/EmploymentTab';
import EducationTab from '../components/EducationTab';
import {
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
} from '../constants';
import { createActionHelper } from '../lib/redux';
import type { Profile } from '../flow/profileTypes';
import { startProfileEdit } from '../actions/profile';

class ProfilePage extends ProfileFormContainer {
  currentStep: Function = (): string => {
    const { ui: { profileStep } } = this.props;
    return profileStep;
  };

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(startProfileEdit(SETTINGS.user.username));
  }

  stepTransitions: Function = (): [void|() => void, () => void] => {
    const { dispatch } = this.props;
    let setStep = createActionHelper(dispatch, setProfileStep);
    let createStepFunc = step => () => {
      setStep(step);
      ReactDOM.findDOMNode(this).querySelector(".profile-pagination").scrollIntoView();
    };
    switch ( this.currentStep() ) {
    case EDUCATION_STEP:
      return [createStepFunc(PERSONAL_STEP), createStepFunc(EMPLOYMENT_STEP)];
    case EMPLOYMENT_STEP:
      return [
        createStepFunc(EDUCATION_STEP),
        () => this.context.router.push('/dashboard')
      ];
    default:
      return [undefined, createStepFunc(EDUCATION_STEP)];
    }
  };

  currentComponent: Function = (props): React$Element<*> => {
    switch ( this.currentStep() ) {
    case EDUCATION_STEP:
      return <EducationTab {...props} />;
    case EMPLOYMENT_STEP:
      return <EmploymentTab {...props} />;
    default:
      return <PersonalTab {...props} />;
    }
  };

  render() {
    const { profiles } = this.props;
    const profileInfo = profiles[SETTINGS.user.username];
    let props;
    let [prev, next] = this.stepTransitions();
    props = Object.assign({}, this.profileProps(profileInfo), {
      prevStep: prev,
      nextStep: next
    });
    let profile: Profile = props.profile;

    let loaded, content, errorMessage;
    if (profileInfo !== undefined) {
      loaded = profileInfo.getStatus !== FETCH_PROCESSING;
      if (profileInfo.errorInfo !== undefined) {
        errorMessage = <ErrorMessage errorInfo={profileInfo.errorInfo} />;
      } else {
        content = <div>
          <WelcomeBanner profile={profile} />
          <div className="profile-pagination">
            {makeProfileProgressDisplay(this.currentStep())}
          </div>
          <section className="profile-form">
            {this.currentComponent(props)}
          </section>
        </div>;
      }
    } else {
      loaded = false;
    }

    return (
      <div className="single-column">
        <Loader loaded={loaded}>
          {errorMessage}
          {content}
        </Loader>
      </div>
    );
  }
}

export default connect(ProfileFormContainer.mapStateToProps)(ProfilePage);

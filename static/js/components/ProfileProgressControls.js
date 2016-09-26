// @flow
import React from 'react';

import { saveProfileStep } from '../util/profile_edit';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

export default class ProfileProgressControls extends React.Component {
  props: {
    nextStep:     () => void,
    prevStep:     () => void,
    nextBtnLabel: string,
    isLastTab:    boolean,
    validator:    Function,
    profile:      Profile,
    ui:           UIState,
    saveProfile:  SaveProfileFunc,
    programIdForEnrollment: ?number,
    addProgramEnrollment: Function,
  };

  saveAndContinue: Function = (): void => {
    const {
      nextStep,
      isLastTab,
      validator,
      programIdForEnrollment,
      addProgramEnrollment
    } = this.props;

    saveProfileStep.call(this, validator, isLastTab).then(() => {
      if (programIdForEnrollment && addProgramEnrollment) {
        addProgramEnrollment(programIdForEnrollment);
      }
      nextStep();
    });
  };

  render() {
    const { nextStep, prevStep, nextBtnLabel } = this.props;

    let prevButton, nextButton;
    if(prevStep) {
      prevButton = <button
        className="mm-button prev"
        onClick={prevStep}>
        <span>Go Back</span>
      </button>;
    }
    if(nextStep) {
      nextButton = <button
        role="button"
        className="mm-button main-action next"
        onClick={this.saveAndContinue}>
        <span>{nextBtnLabel}</span>
      </button>;
    }
    return <div className="profile-progress-controls">
      {nextButton}
      {prevButton}
    </div>;
  }

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };
}

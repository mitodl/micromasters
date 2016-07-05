// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';

import { saveProfileStep } from '../util/profile_edit';
import type { Profile, BoundSaveProfile } from '../flow/profileTypes';
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
    saveProfile:  BoundSaveProfile,
  };

  saveAndContinue: Function = (): void => {
    const { nextStep, isLastTab, validator } = this.props;
    saveProfileStep.call(this, validator, isLastTab).then(() => {
      nextStep();
    });
  };

  render() {
    const { nextStep, prevStep, nextBtnLabel } = this.props;

    let prevButton, nextButton;
    if(prevStep) {
      prevButton = <Button
        raised
        className="progress-button previous"
        onClick={prevStep}>
        <span>Previous</span>
      </Button>;
    }
    if(nextStep) {
      nextButton = <Button
        raised
        colored
        className="progress-button next"
        onClick={this.saveAndContinue}>
        <span>{nextBtnLabel}</span>
      </Button>;
    }
    return <div>
      {prevButton}
      {nextButton}
    </div>;
  }

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };
}

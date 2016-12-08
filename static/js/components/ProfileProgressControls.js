// @flow
import React from 'react';
import Spinner from 'react-mdl/lib/Spinner';

import { saveProfileStep } from '../util/profile_edit';
import { FETCH_PROCESSING } from '../actions';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

export default class ProfileProgressControls extends React.Component {
  props: {
    nextUrl?:      string,
    prevUrl?:      string,
    nextBtnLabel: string,
    isLastTab:    boolean,
    validator:    Function,
    profile:      Profile,
    profilePatchStatus: ?string,
    ui:           UIState,
    saveProfile:  SaveProfileFunc,
    programIdForEnrollment: ?number,
    addProgramEnrollment: Function,
  };

  stepBack: Function = (): void => {
    const { prevUrl } = this.props;
    this.context.router.push(prevUrl);
  };

  saveAndContinue: Function = (): void => {
    const {
      nextUrl,
      isLastTab,
      validator,
      programIdForEnrollment,
      addProgramEnrollment
    } = this.props;

    saveProfileStep.call(this, validator, isLastTab).then(() => {
      if (programIdForEnrollment && addProgramEnrollment) {
        addProgramEnrollment(programIdForEnrollment);
      }
      this.context.router.push(nextUrl);
    });
  };

  render() {
    const { nextUrl, prevUrl, nextBtnLabel, profilePatchStatus } = this.props;

    const inFlight = profilePatchStatus === FETCH_PROCESSING;
    let prevButton, nextButton;
    if (prevUrl) {
      prevButton = <button
        className="mdl-button gray-button go-back prev"
        onClick={this.stepBack}>
        <span>Go Back</span>
      </button>;
    }
    if (nextUrl) {
      nextButton = <button
        role="button"
        className={`mdl-button next ${inFlight ? 'disabled-with-spinner' : ''}`}
        onClick={inFlight ? undefined : this.saveAndContinue}>
        {inFlight ? <Spinner singleColor /> : nextBtnLabel}
      </button>;
    }
    return <div className="profile-progress-controls">
      {prevButton}
      {nextButton}
    </div>;
  }

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };
}

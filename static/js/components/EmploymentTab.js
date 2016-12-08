// @flow
import React from 'react';

import EmploymentForm from './EmploymentForm';
import ProfileProgressControls from './ProfileProgressControls';
import {
  combineValidators,
  personalValidation,
  educationValidation,
  employmentValidation,
} from '../lib/validation/profile';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import { setProfileStep } from '../actions/ui';
import { EMPLOYMENT_STEP } from '../constants';

class EmploymentTab extends React.Component {
  props: {
    saveProfile:           SaveProfileFunc,
    profile:               Profile,
    profilePatchStatus:    ?string,
    ui:                    UIState,
    addProgramEnrollment:  Function,
    dispatch:              Function,
  };

  componentWillMount() {
    const { dispatch } = this.props;
    dispatch(setProfileStep(EMPLOYMENT_STEP));
  }

  render () {
    return (
      <div>
        <EmploymentForm {...this.props} showSwitch={true} validator={employmentValidation} />
        <ProfileProgressControls
          {...this.props}
          nextBtnLabel="I'm Done!"
          prevUrl="/profile/education"
          nextUrl="/dashboard"
          isLastTab={true}
          programIdForEnrollment={null}
          validator={
            combineValidators(
              personalValidation,
              educationValidation,
              employmentValidation
            )
          }
        />
      </div>
    );
  }
}

export default EmploymentTab;

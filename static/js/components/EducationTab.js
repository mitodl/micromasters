// @flow
import React from 'react';

import ProfileProgressControls from './ProfileProgressControls';
import EducationForm from './EducationForm';
import { educationValidation } from '../lib/validation/profile';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import { setProfileStep } from '../actions/ui';
import { EDUCATION_STEP } from '../constants';

class EducationTab extends React.Component {
  props: {
    profile:               Profile,
    profilePatchStatus:    ?string,
    ui:                    UIState,
    saveProfile:           SaveProfileFunc,
    addProgramEnrollment:  Function,
    dispatch:              Function,
  };

  componentWillMount() {
    const { dispatch } = this.props;
    dispatch(setProfileStep(EDUCATION_STEP));
  }

  render() {
    return (
      <div>
        <EducationForm {...this.props} showSwitch={true} validator={educationValidation} />
        <ProfileProgressControls
          {...this.props}
          prevUrl="/profile/personal"
          nextUrl="/profile/professional"
          nextBtnLabel="Next"
          isLastTab={false}
          programIdForEnrollment={null}
          validator={educationValidation}
        />
      </div>
    );
  }
}

export default EducationTab;

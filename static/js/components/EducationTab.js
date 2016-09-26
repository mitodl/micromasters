// @flow
import React from 'react';

import ProfileProgressControls from './ProfileProgressControls';
import EducationForm from './EducationForm';
import { educationValidation } from '../util/validation';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class EducationTab extends React.Component {
  props: {
    nextStep:     () => void,
    prevStep:     () => void,
    profile:      Profile,
    ui:           UIState,
    saveProfile:  SaveProfileFunc,
    addProgramEnrollment: Function,
  };

  render() {
    return (
      <div>
        <EducationForm {...this.props} validator={educationValidation} />
        <ProfileProgressControls
          {...this.props}
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

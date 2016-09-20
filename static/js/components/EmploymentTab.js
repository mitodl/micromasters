// @flow
import React from 'react';

import EmploymentForm from './EmploymentForm';
import ProfileProgressControls from './ProfileProgressControls';
import {
  combineValidators,
  personalValidation,
  educationValidation,
  employmentValidation,
} from '../util/validation';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class EmploymentTab extends React.Component {
  props: {
    saveProfile:  SaveProfileFunc,
    profile:      Profile,
    ui:           UIState,
    nextStep:     () => void,
    prevStep:     () => void,
  };

  render () {
    return (
      <div>
        <EmploymentForm {...this.props} showSwitch={true} validator={employmentValidation} />
        <ProfileProgressControls
          {...this.props}
          nextBtnLabel="I'm Done!"
          isLastTab={true}
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

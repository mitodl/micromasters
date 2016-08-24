// @flow
import React from 'react';
import Card from 'react-mdl/lib/Card/Card';

import PersonalForm from './PersonalForm';
import ProfileProgressControls from './ProfileProgressControls';
import { personalValidation } from '../util/validation';
import ValidationAlert  from './ValidationAlert';
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class PersonalTab extends React.Component {
  props: {
    profile:        Profile,
    errors:         ValidationErrors,
    saveProfile:    SaveProfileFunc,
    updateProfile:  UpdateProfileFunc,
    ui:             UIState,
    nextStep:       () => void,
    prevStep:       () => void,
  };

  render() {
    return (
      <div>
        <Card shadow={1} className="profile-form">
          <PersonalForm {...this.props} validator={personalValidation} showTOSInputs={true} />
          <ValidationAlert {...this.props} />
        </Card>
        <ProfileProgressControls
          {...this.props}
          nextBtnLabel="Next"
          isLastTab={false}
          validator={personalValidation}
        />
      </div>
    );
  }
}

export default PersonalTab;

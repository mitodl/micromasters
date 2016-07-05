// @flow
/* global SETTINGS: false */
import React from 'react';

import ProfileFormFields from '../util/ProfileFormFields';
import type { Profile, ValidationErrors } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class PrivacyForm extends ProfileFormFields {
  props: {
    profile:        Profile,
    ui:             UIState,
    updateProfile:  Function,
    errors:         ValidationErrors,
  };

  render() {
    return (
      <div>
        <h4 className="privacy-form-heading">Who can see your profile?</h4>
        { this.boundRadioGroupField(['account_privacy'], '', this.privacyOptions) }
      </div>
    );
  }
}

export default PrivacyForm;

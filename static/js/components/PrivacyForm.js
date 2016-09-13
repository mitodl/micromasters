// @flow
/* global SETTINGS: false */
import React from 'react';
import { Card } from 'react-mdl/lib/Card';

import ProfileFormFields from '../util/ProfileFormFields';
import type { Profile, ValidationErrors, UpdateProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

class PrivacyForm extends ProfileFormFields {
  props: {
    profile:        Profile,
    ui:             UIState,
    updateProfile:  UpdateProfileFunc,
    errors:         ValidationErrors,
  };

  render() {
    const emailOptions = [
      { value: "true", label: "Faculty and staff can send me emails"},
      { value: "false", label: "I don't want to receive any emails" }
    ];
    return (
      <div>
        <Card shadow={1} className="profile-form">
          <h4 className="privacy-form-heading">Who can see your profile?</h4>
          <div className="profile-form-row">
            { this.boundRadioGroupField(['account_privacy'], '', this.privacyOptions) }
          </div>
        </Card>
        <Card shadow={1} className="profile-form">
          <h4 className="privacy-form-heading">Email Preferences</h4>
          <div className="profile-form-row">
            { this.boundRadioGroupField(['email_optin'], '', emailOptions) }
          </div>
        </Card>
      </div>
    );
  }
}

export default PrivacyForm;

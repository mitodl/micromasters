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

  privacyOptions: Array<{value: string, label: string, helper: string}> = [
    { value: 'public', label: 'Public to the world', helper: `Your MicroMasters profile will be 
      visible to all website visitors.` },
    { value: 'public_to_mm', label: "Public to other MicroMasters students", helper: `Your profile will be 
      visible to other MicroMasters learners, and to MIT faculty and staff.` },
    { value: 'private', label: 'Private', helper: `Your MicroMasters profile will only 
      be visible to MIT faculty and staff.` }
  ];

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

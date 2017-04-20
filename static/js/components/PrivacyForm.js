// @flow
/* global SETTINGS: false */
import DocumentTitle from 'react-document-title';
import React from 'react';
import { Card } from 'react-mdl/lib/Card';

import ProfileFormFields from '../util/ProfileFormFields';
import type { Profile, ValidationErrors, UpdateProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { Validator } from '../lib/validation/profile';

class PrivacyForm extends ProfileFormFields {
  props: {
    profile:        Profile,
    ui:             UIState,
    updateProfile:  UpdateProfileFunc,
    errors:         ValidationErrors,
    validator:      Validator,
  };

  privacyOptions: Array<{value: string, label: string, helper: string}> = [
    { value: 'public', label: 'Public to the world', helper: `Your MicroMasters profile will be 
      visible to all website visitors.` },
    { value: 'public_to_mm', label: "Public to other MicroMasters students", helper: `Your profile will be 
      visible to other MicroMasters learners, and to MIT faculty and staff.` },
    { value: 'private', label: 'Private', helper: `Your MicroMasters profile will only 
      be visible to MIT faculty and staff.` }
  ];

  emailOptions: Array<{value: string, label: string}> = [
    { value: "true", label: "Faculty, staff, and other learners can send me emails"},
    { value: "false", label: "I don't want to receive any emails" }
  ];

  render() {
    return (
      <DocumentTitle title="Settings | MITx MicroMasters">
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
              { this.boundRadioGroupField(['email_optin'], '', this.emailOptions) }
            </div>
          </Card>
        </div>
      </DocumentTitle>
    );
  }
}

export default PrivacyForm;

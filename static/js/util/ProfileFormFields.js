// @flow
import React from 'react';
import _ from 'lodash';

import {
  boundDateField,
  boundTextField,
  boundRadioGroupField,
} from './profile_edit';
import { EDUCATION_LEVELS } from '../constants';
import LANGUAGE_CODES from '../language_codes';
import INDUSTRIES from '../industries';
import type { Option } from '../flow/generalTypes';

export default class ProfileFormFields extends React.Component {
  constructor(props: Object) {
    super(props);

    // bind our field methods to this
    this.boundTextField = boundTextField.bind(this);
    this.boundDateField = boundDateField.bind(this);
    this.boundRadioGroupField = boundRadioGroupField.bind(this);

    // options we set (for select components)
    this.genderOptions = [
      { value: 'm', label: 'Male' },
      { value: 'f', label: 'Female' },
      { value: 'o', label: 'Other/Prefer not to say' }
    ];
    let languageOptions = LANGUAGE_CODES.map(language => ({
      value: language.alpha2,
      label: language.English
    }));
    this.languageOptions = _.sortBy(languageOptions, 'label');
    this.privacyOptions = [
      { value: 'public', label: 'Public to the world', helper: `Your MicroMasters profile will be 
        visible to all website visitors.` },
      { value: 'public_to_mm', label: "Public to other MicroMasters students", helper: `Your profile will be 
        visible to other MicroMasters learners, and to MIT faculty and staff.` },
      { value: 'private', label: 'Private', helper: `Your MicroMasters profile will only 
        be visible to MIT faculty and staff.` }
    ];
    this.educationLevelOptions = EDUCATION_LEVELS;
    this.industryOptions = INDUSTRIES.map(industry => ({
      value: industry,
      label: industry
    }));
  }
  
  // type declarations
  boundTextField: Function;
  boundDateField: Function;
  boundRadioGroupField: Function;
  genderOptions: Option[];
  languageOptions: Option[];
  privacyOptions: Array<{value: string, label: string, helper: string}>;
  educationLevelOptions: Option[];
  industryOptions: Option[];

  defaultInputComponentProps: Function = (): Object => {
    return {
      profile: this.props.profile,
      updateProfile: this.props.updateProfile,
      saveProfile: this.props.saveProfile,
      errors: this.props.errors
    };
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static propTypes = {
    profile:                      React.PropTypes.object,
    updateProfile:                React.PropTypes.func,
    saveProfile:                  React.PropTypes.func,
    errors:                       React.PropTypes.object,
    setDeletionIndex:             React.PropTypes.func,
    setShowWorkDeleteDialog:      React.PropTypes.func,
    setShowEducationDeleteDialog: React.PropTypes.func,
    showSwitch:                   React.PropTypes.bool
  };

  closeConfirmDeleteDialog: Function = (): void => {
    const {
      setDeletionIndex,
      setShowEducationDeleteDialog,
      setShowWorkDeleteDialog
    } = this.props;
    setShowEducationDeleteDialog(false);
    setShowWorkDeleteDialog(false);
    setDeletionIndex(null);
  };

  openEducationDeleteDialog: Function = (index: number): void => {
    const { setDeletionIndex, setShowEducationDeleteDialog } = this.props;
    setDeletionIndex(index);
    setShowEducationDeleteDialog(true);
  };

  openWorkDeleteDialog:Function = (index: number): void => {
    const { setDeletionIndex, setShowWorkDeleteDialog } = this.props;
    setDeletionIndex(index);
    setShowWorkDeleteDialog(true);
  };
}

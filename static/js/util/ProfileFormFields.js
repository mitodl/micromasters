// @flow
import React from 'react';

import {
  boundDateField,
  boundTextField,
  boundRadioGroupField,
  boundCheckbox,
  boundGeosuggest,
} from './profile_edit';

export default class ProfileFormFields extends React.Component {
  constructor(props: Object) {
    super(props);

    // bind our field methods to this
    this.boundTextField = boundTextField.bind(this);
    this.boundDateField = boundDateField.bind(this);
    this.boundRadioGroupField = boundRadioGroupField.bind(this);
    this.boundCheckbox = boundCheckbox.bind(this);
    this.boundGeosuggest = boundGeosuggest.bind(this);
  }

  // type declarations
  boundTextField: Function;
  boundDateField: Function;
  boundRadioGroupField: Function;
  boundCheckbox: Function;
  boundGeosuggest: Function;

  defaultInputComponentProps = (): Object => {
    return {
      profile: this.props.profile,
      updateProfile: this.props.updateProfile,
      saveProfile: this.props.saveProfile,
      errors: this.props.errors,
      validator: this.props.validator,
      updateValidationVisibility: this.props.updateValidationVisibility,
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
    showSwitch:                   React.PropTypes.bool,
    validator:                    React.PropTypes.func,
    updateValidationVisibility:   React.PropTypes.func,
  };

  closeConfirmDeleteDialog = (): void => {
    const {
      setDeletionIndex,
      setShowEducationDeleteDialog,
      setShowWorkDeleteDialog
    } = this.props;
    setShowEducationDeleteDialog(false);
    setShowWorkDeleteDialog(false);
    setDeletionIndex(null);
  };
}

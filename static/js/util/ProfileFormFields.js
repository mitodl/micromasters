// @flow
import React from "react"
import PropTypes from "prop-types"

import {
  boundDateField,
  boundTextField,
  boundCheckbox,
  boundTelephoneInput
} from "./profile_edit"

export default class ProfileFormFields extends React.Component {
  constructor(props: Object) {
    super(props)

    // bind our field methods to this
    this.boundTextField = boundTextField.bind(this)
    this.boundDateField = boundDateField.bind(this)
    this.boundCheckbox = boundCheckbox.bind(this)
    this.boundTelephoneInput = boundTelephoneInput.bind(this)
  }

  // type declarations
  boundTextField: Function
  boundDateField: Function
  boundCheckbox: Function
  boundTelephoneInput: Function

  defaultInputComponentProps = (): Object => {
    return {
      profile:                    this.props.profile,
      updateProfile:              this.props.updateProfile,
      saveProfile:                this.props.saveProfile,
      errors:                     this.props.errors,
      validator:                  this.props.validator,
      updateValidationVisibility: this.props.updateValidationVisibility
    }
  }

  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  static propTypes = {
    profile:                      PropTypes.object,
    updateProfile:                PropTypes.func,
    saveProfile:                  PropTypes.func,
    errors:                       PropTypes.object,
    setDeletionIndex:             PropTypes.func,
    setShowWorkDeleteDialog:      PropTypes.func,
    setShowEducationDeleteDialog: PropTypes.func,
    showSwitch:                   PropTypes.bool,
    validator:                    PropTypes.func,
    updateValidationVisibility:   PropTypes.func
  }

  closeConfirmDeleteDialog = (): void => {
    const {
      setDeletionIndex,
      setShowEducationDeleteDialog,
      setShowWorkDeleteDialog
    } = this.props
    setShowEducationDeleteDialog(false)
    setShowWorkDeleteDialog(false)
    setDeletionIndex(null)
  }
}

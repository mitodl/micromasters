// @flow
import React from "react"
import _ from "lodash"
import TextField from "@material-ui/core/TextField"
import Radio from "@material-ui/core/Radio"
import Checkbox from "@material-ui/core/Checkbox"
import R from "ramda"
import ReactTelInput from "react-telephone-input"

import DateField from "../components/inputs/DateField"
import { validationErrorSelector, classify } from "./util"
import { sendFormFieldEvent } from "../lib/google_analytics"
import type { Validator, UIValidator } from "../lib/validation/profile"
import type { Profile } from "../flow/profileTypes"
import { CP1252_REGEX } from "../constants"
import FormControlLabel from "@material-ui/core/FormControlLabel"

// utility functions for pushing changes to profile forms back to the
// redux store.
// this expects that the `updateProfile` and `profile` props are passed
// in to whatever component it is used in.

const radioButtonLabelSelector = label => `radio-label-${classify(label)}`

const radioButtonLabel = label => (
  <label id={radioButtonLabelSelector(label)} className="radio-label">
    {label}
  </label>
)

export const radioButtons = R.map(option => (
  <FormControlLabel
    classes={{ root: "profile-radio-button" }}
    value={option.value}
    control={<Radio />}
    label={radioButtonLabel(option.label)}
    key={option.label}
  />
))

/**
 * bind to this.boundTextField in the constructor of a form component
 * to update text fields when editing the profile
 * we pass in a keyset looking like this:
 *
 * ["top-level-key", index, "nested_object_key"] or just ["top_level_key"]
 */
export function boundTextField(
  keySet: string[],
  label: string,
  {
    multiLine = false,
    maxLength = 0
    }: { multiLine: boolean, maxLength: number } = {}
): React$Element<*> {
  const {
    profile,
    errors,
    updateProfile,
    validator,
    updateValidationVisibility,
    updateProfileValidation
  } = this.props

  const onChange = e => {
    const clone = _.cloneDeep(profile)
    _.set(clone, keySet, e.target.value)
    updateValidationVisibility(keySet)
    updateProfile(clone, validator)
  }

  const onBlur = () => {
    updateValidationVisibility(keySet)
    updateProfileValidation(profile, validator)
    sendFormFieldEvent(keySet)
  }

  const getValue = () => {
    const value = _.get(profile, keySet, "")
    return _.isNull(value) || _.isUndefined(value) ? "" : value
  }

  // fullWidth means set width to 100% instead of 256px. This lets us use the
  // Grid and Cell to manage its size
  const options = {}
  if (maxLength) {
    options.maxLength = maxLength
  }
  const error = _.get(errors, keySet, undefined) !== undefined
  return (
    <TextField
      onBlur={onBlur}
      name={label}
      multiline={multiLine}
      classes={{
        root: `input-text ${validationErrorSelector(errors, keySet)}`
      }}
      label={label}
      value={getValue()}
      fullWidth={true}
      error={error}
      onChange={onChange}
      {...options}
    />
  )
}

/**
 * bind this to this.boundDateField in the constructor of a form component
 * to update date fields
 * pass in the name (used as placeholder), key for profile.
 */
export function boundDateField(
  keySet: string[],
  label: string,
  omitDay: boolean,
  allowFutureYear: boolean = false
): React$Element<*> {
  // eslint-disable-line max-len
  const {
    profile,
    errors,
    updateProfile,
    validator,
    updateValidationVisibility,
    updateProfileValidation
  } = this.props

  const onBlur = () => {
    updateValidationVisibility(keySet)
    updateProfileValidation(profile, validator)
    sendFormFieldEvent(keySet)
  }

  return (
    <DateField
      data={profile}
      errors={errors}
      updateHandler={updateProfile}
      onBlur={onBlur}
      validator={validator}
      keySet={keySet}
      label={label}
      omitDay={omitDay}
      allowFutureYear={allowFutureYear}
    />
  )
}

export function boundCheckbox(
  keySet: string[],
  label: string | React$Element<*>
): React$Element<*> {
  const {
    profile,
    errors,
    updateProfile,
    validator,
    updateValidationVisibility
  } = this.props

  const onChange = e => {
    const clone = _.cloneDeep(profile)
    _.set(clone, keySet, e.target.checked)
    updateValidationVisibility(keySet)
    updateProfile(clone, validator)
    sendFormFieldEvent(keySet)
  }

  const style = {
    backgroundColor: "#a31f34"
  }

  return (
    <div
      className={`bound-check-box ${validationErrorSelector(errors, keySet)}`}
    >
      <div className="first-row">
        <Checkbox
          checked={_.get(profile, keySet)}
          onCheck={onChange}
          inputStyle={style}
        />
        <span className="label">{label}</span>
      </div>
      <span className="validation-error-text">{_.get(errors, keySet)}</span>
    </div>
  )
}

const onTelChange = R.curry(
  (keySet, profile, updateProfile, validator, newPhoneNumber) => {
    const currentPhoneNumber = _.get(profile, keySet)
    if (currentPhoneNumber !== newPhoneNumber) {
      const clone = _.cloneDeep(profile)
      _.set(clone, keySet, newPhoneNumber)
      updateProfile(clone, validator)
    }
  }
)

export function boundTelephoneInput(keySet: string[]): React$Element<*> {
  const {
    profile,
    errors,
    updateProfile,
    validator,
    updateProfileValidation,
    updateValidationVisibility
  } = this.props

  const onBlur = () => {
    updateValidationVisibility(keySet)
    updateProfileValidation(profile, validator)
    sendFormFieldEvent(keySet)
  }

  const currentCountry = R.toLower(R.pathOr("", ["country"], profile))
  return (
    <div
      className={`bound-telephone ${validationErrorSelector(errors, keySet)}`}
    >
      <ReactTelInput
        defaultCountry={currentCountry}
        flagsImagePath="/static/images/flags.png"
        onChange={onTelChange(keySet, profile, updateProfile, validator)}
        onBlur={onBlur}
        value={R.pathOr("", keySet, profile)}
      />
      <span className="validation-error-text">{_.get(errors, keySet)}</span>
    </div>
  )
}

/**
 * Validates the profile then PATCHes the profile if validation succeeded.
 * Returns a promise which resolves with the new profile if validation and PATCH succeeded,
 * or rejects if either failed
 */
export function saveProfileStep(
  validator: Validator | UIValidator,
  isLastStep: boolean = false
): Promise<Profile> {
  const { saveProfile, profile, ui } = this.props
  const clone = {
    ...profile,
    filled_out: profile.filled_out || isLastStep
  }

  if (isLastStep && !profile.filled_out) {
    clone.email_optin = true
  }
  return saveProfile(validator, clone, ui)
}

/**
 * Returns true when first name or last name has non CP-1252 string(s).
 */
export function shouldRenderRomanizedFields(profile: Profile): boolean {
  const firstName = _.get(profile, ["first_name"], "")
  const lastName = _.get(profile, ["last_name"], "")
  return !CP1252_REGEX.test(firstName) || !CP1252_REGEX.test(lastName)
}

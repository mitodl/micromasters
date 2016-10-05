// @flow
import React from 'react';
import _ from 'lodash';
import TextField from 'material-ui/TextField';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';
import Checkbox from 'material-ui/Checkbox';

import DateField from '../components/inputs/DateField';
import { validationErrorSelector } from './util';
import type { Validator, UIValidator } from './validation';
import type { Profile } from '../flow/profileTypes';
import type { Option } from '../flow/generalTypes';

// utility functions for pushing changes to profile forms back to the
// redux store.
// this expects that the `updateProfile` and `profile` props are passed
// in to whatever component it is used in.

/**
 * bind this to this.boundRadioGroupField in the constructor of a form component
 * to update radio buttons.
 * pass in the name (used as placeholder), key for profile, and the options.
 */
export function boundRadioGroupField(keySet: string[], label: string, options: Option[]): React$Element<*> {
  const { profile, updateProfile, errors, validator } = this.props;
  const styles = {
    labelStyle: {
      left: -10,
      width: '100%'
    }
  };

  let onChange = e => {
    let clone = _.cloneDeep(profile);
    let value = e.target.value;
    if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    }
    _.set(clone, keySet, value);
    updateProfile(clone, validator);
  };

  const radioButtons = options.map(obj => {
    let helper = "";
    if (obj.helper) {
      helper = `${obj.helper}`;
    }
    let label = (
      <span className="radio-label">
        {obj.label}
        <p className="radio-label-hint">{helper}</p>
      </span>
    );

    return (
      <RadioButton
        className="profile-radio-button"
        key={obj.value}
        labelStyle={styles.labelStyle}
        value={obj.value}
        label={label}
      />
    );
  });

  const value = String(_.get(profile, keySet));
  return (
    <div className={validationErrorSelector(errors, keySet)}>
      <span className="profile-radio-group-label">
        {label}
      </span>
      <RadioButtonGroup
        className="profile-radio-group"
        name={label}
        onChange={onChange}
        valueSelected={value}
      >
        {radioButtons}
      </RadioButtonGroup>
      <span className="validation-error-text">
        {_.get(errors, keySet)}
      </span>
    </div>
  );
}

/**
 * bind to this.boundTextField in the constructor of a form component
 * to update text fields when editing the profile
 * we pass in a keyset looking like this:
 *
 * ["top-level-key", index, "nested_object_key"] or just ["top_level_key"]
 */
export function boundTextField(keySet: string[], label: string): React$Element<*> {
  const {
    profile,
    errors,
    updateProfile,
    validator,
  } = this.props;
  let onChange = e => {
    let clone = _.cloneDeep(profile);
    _.set(clone, keySet, e.target.value);
    updateProfile(clone, validator);
  };
  let getValue = () => {
    let value = _.get(profile, keySet, "");
    return ( _.isNull(value) || _.isUndefined(value) ) ? "" : value;
  };

  // fullWidth means set width to 100% instead of 256px. This lets us use the
  // Grid and Cell to manage its size
  return (
    <TextField
      name={label}
      className={validationErrorSelector(errors, keySet)}
      floatingLabelText={label}
      value={getValue()}
      fullWidth={true}
      errorText={_.get(errors, keySet)}
      onChange={onChange} />
  );
}

/**
 * bind this to this.boundDateField in the constructor of a form component
 * to update date fields
 * pass in the name (used as placeholder), key for profile.
 */
export function boundDateField(keySet: string[], label: string, omitDay: boolean): React$Element<*> {
  const {
    profile,
    errors,
    updateProfile,
    validator,
  } = this.props;

  return <DateField
    data={profile}
    errors={errors}
    updateHandler={updateProfile}
    validator={validator}
    keySet={keySet}
    label={label}
    omitDay={omitDay}
  />;
}

export function boundCheckbox(keySet: string[], label: string|React$Element<*>): React$Element<*> {
  const {
    profile,
    errors,
    updateProfile,
    validator,
  } = this.props;

  let onChange = e => {
    let clone = _.cloneDeep(profile);
    _.set(clone, keySet, e.target.checked);
    updateProfile(clone, validator);
  };

  const style = {
    'backgroundColor': '#a31f34'
  };

  return (
    <div className={`bound-check-box ${validationErrorSelector(errors, keySet)}`}>
      <div className="first-row">
        <Checkbox
          checked={_.get(profile, keySet)}
          onCheck={onChange}
          inputStyle={style}
        />
        <span className="label">
          { label }
        </span>
      </div>
      <span className="validation-error-text">
        {_.get(errors, keySet)}
      </span>
    </div>
  );
}

/**
 * Validates the profile then PATCHes the profile if validation succeeded.
 * Returns a promise which resolves with the new profile if validation and PATCH succeeded,
 * or rejects if either failed
 */
export function saveProfileStep(validator: Validator|UIValidator, isLastStep: boolean = false): Promise<Profile> {
  const { saveProfile, profile, ui } = this.props;
  let clone = Object.assign({}, profile, {
    filled_out: profile.filled_out || isLastStep
  });

  if (isLastStep && !profile.filled_out) {
    clone.email_optin = true;
  }
  return saveProfile(validator, clone, ui);
}

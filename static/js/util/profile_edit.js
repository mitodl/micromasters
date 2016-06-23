// @flow
import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import TextField from 'material-ui/TextField';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import { ISO_8601_FORMAT } from '../constants';
import {
  validateMonth,
  validateYear,
  validateDay,
} from '../util/validation';
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
export function boundRadioGroupField(keySet: string[], label: string, options: Option[]): React$Element {
  const { profile, updateProfile, errors } = this.props;
  const styles = {
    labelStyle: {
      left: -10,
    }
  };

  let onChange = e => {
    let clone = _.cloneDeep(profile);
    _.set(clone, keySet, e.target.value);
    updateProfile(clone);
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

  const value = _.get(profile, keySet);
  return (
    <div>
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
export function boundTextField(keySet: string[], label: string): React$Element {
  const {
    profile,
    errors,
    updateProfile
  } = this.props;
  let onChange = e => {
    let clone = _.cloneDeep(profile);
    _.set(clone, keySet, e.target.value);
    updateProfile(clone);
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
export function boundDateField(keySet: string[], label: string, omitDay: boolean): React$Element {
  const {
    profile,
    errors,
    updateProfile,
  } = this.props;

  // make a copy of keySet with a slightly different key for temporary storage of the textfields being edited
  let editKeySet = keySet.concat();
  editKeySet[editKeySet.length - 1] = `${editKeySet[editKeySet.length - 1]}_edit`;

  // Get the moment object from the state, or null if not available
  let getDate = () => {
    let formattedDate = _.get(profile, keySet);

    if (formattedDate !== undefined && formattedDate !== null) {
      return moment(formattedDate, ISO_8601_FORMAT);
    }
    return null;
  };

  // Get an object { day, month, year } which contains the values being edited in the textbox
  // values may be strings or numbers. Otherwise return empty object.
  let getEditObject = () => {
    let edit = _.get(profile, editKeySet, {});

    if (_.isEmpty(edit)) {
      let date = getDate();
      if (date !== null && date.isValid()) {
        return {
          month: date.month() + 1,
          year: date.year(),
          day: date.date()
        };
      }
    }
    return edit;
  };

  // Given text values date, month and year, update the formatted date in the profile
  // if day, month and year are filled out. If at least one are invalid, store the text
  // representation instead in a temporary edit value and store null in place of the
  // date format.
  let setNewDate = (day, month, year) => {
    let clone = _.cloneDeep(profile);

    let edit = getEditObject();
    // Update tuple with the typed text. Typically only one of the arguments
    // will have text at a time since the user can't edit more than one field at once
    // so we need to look in the state to see
    let newEdit = Object.assign({}, edit, {
      year: year !== undefined ? year : edit.year,
      month: month !== undefined ? month : edit.month,
      day: day !== undefined ? day : edit.day
    });
    
    // these functions return undefined if a month, day, or year is invalid, and converts the value to a number
    // except if the input value is an empty string, in which case an empty string is returned
    let validatedDay = 1;
    if (!omitDay) {
      validatedDay = validateDay(newEdit.day);
    }
    let validatedMonth = validateMonth(newEdit.month);
    let validatedYear = validateYear(newEdit.year);

    // keep text up to date
    _.set(clone, editKeySet, newEdit);

    if ([validatedDay, validatedMonth, validatedYear].includes(undefined)) {
      // store the edit value and make the formatted date undefined so it doesn't pass validation
      _.set(clone, keySet, null);
    } else {
      let momentDate = moment(`${validatedYear}-${validatedMonth}-${validatedDay}`, ISO_8601_FORMAT);
      if (!momentDate.isValid()) {
        // date is invalid according to moment.js so make the formatted date undefined so it
        // doesn't pass validation
        _.set(clone, keySet, null);
      } else {
        // format date and store it
        _.set(clone, keySet, momentDate.format(ISO_8601_FORMAT));
      }
    }
    updateProfile(clone);
  };

  let edit = getEditObject();

  let dayField, daySlash;
  if (!omitDay) {
    daySlash = <span className="slash"> / </span>;
    dayField = <TextField
      hintText="DD"
      floatingLabelText=" "
      floatingLabelFixed={true}
      style={{
        maxWidth: "2em"
      }}
      fullWidth={true}
      value={edit.day !== undefined ? edit.day : ""}
      onChange={e => setNewDate(e.target.value, undefined, undefined)}
    />;
  }

  return <div>
    <TextField
      floatingLabelText={label}
      floatingLabelFixed={true}
      floatingLabelStyle={{whiteSpace: "nowrap"}}
      hintText="MM"
      style={{
        maxWidth: "2em"
      }}
      errorStyle={{
        position: "absolute",
        top: "100%",
        whiteSpace: "nowrap"
      }}
      fullWidth={true}
      value={edit.month !== undefined ? edit.month : ""}
      onChange={e => setNewDate(undefined, e.target.value, undefined)}
      errorText={_.get(errors, keySet)}
    />
    <span className="slash"> / </span>
    {dayField}
    {daySlash}
    <TextField
      hintText="YYYY"
      floatingLabelFixed={true}
      floatingLabelText=" "
      style={{
        maxWidth: "4em"
      }}
      fullWidth={true}
      value={edit.year !== undefined ? edit.year : ""}
      onChange={e => setNewDate(undefined, undefined, e.target.value)}
    />
  </div>;
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
  if (isLastStep) {
    // user has also seen email consent message at this point
    clone.email_optin = true;
  }
  return saveProfile(validator, clone, ui);
}

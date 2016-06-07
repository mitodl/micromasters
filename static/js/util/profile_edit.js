import React from 'react';
import moment from 'moment';
import iso3166 from 'iso-3166-2';
import _ from 'lodash';
import AutoComplete from '../components/AutoComplete';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';

import { ISO_8601_FORMAT } from '../constants';
import {
  validateMonth,
  validateYear,
  validateDay,
} from '../util/validation';

// utility functions for pushing changes to profile forms back to the
// redux store.
// this expects that the `updateProfile` and `profile` props are passed
// in to whatever component it is used in.

/**
 * bind this to this.boundRadioGroupField in the constructor of a form component
 * to update radio buttons.
 * pass in the name (used as placeholder), key for profile, and the options.
 *
 * @param keySet {String[]} Path to the field
 * @param label {String} Label for the field
 * @param options {Object[]} A list of options for the select field
 * @returns {ReactElement}
 */
export function boundRadioGroupField(keySet, label, options) {
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
      helper = `- ${obj.helper}`;
    }
    let label = (
      <span className="radio-label">
        {obj.label}<span className="radio-label-hint">{helper}</span>
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
 *
 * @param keySet {String[]} Path to the field
 * @param label {String} Label for the field
 * @returns {ReactElement}
 */
export function boundTextField(keySet, label) {
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
 * bind this to this.boundSelectField in the constructor of a form component
 * to update select fields
 * pass in the name (used as placeholder), key for profile, and the options.
 *
 * @param keySet {String[]} Path to the field
 * @param label {String} Label for the field
 * @param options {Object[]} A list of options for the select field
 * @param onChange {func} Handler which is called when the state changes or is cleared.
 * Takes the updated profile as argument
 * @returns {ReactElement}
 */
export function boundSelectField(keySet, label, options, onChange) {
  const {
    profile,
    errors,
    updateProfile,
  } = this.props;

  // use a temporary edit value to store text currently in the textbox
  let editKeySet = keySet.concat();
  editKeySet[editKeySet.length - 1] = `${editKeySet[editKeySet.length - 1]}_edit`;

  let caseInsensitivePrefixFilter = (searchText, key) => {
    let index = key.toLowerCase().indexOf(searchText.toLowerCase());
    return index === 0;
  };

  let onNewRequest = (optionOrString, index) => {
    let clone = _.cloneDeep(profile);
    let toStore;
    if (index === -1) {
      // enter was pressed and optionOrString is a string
      // select first item in dropdown if any are present
      let filteredOptionValues = options.
        map(option => option.label).
        filter(caseInsensitivePrefixFilter.bind(this, optionOrString));
      if (filteredOptionValues.length > 0) {
        let option = options.find(option => option.label === filteredOptionValues[0]);
        toStore = option.value;
      }
    } else {
      // user selected an item in the menu
      toStore = _.get(optionOrString, ['value', 'props', 'value']);
    }

    if (toStore !== undefined) {
      _.set(clone, keySet, toStore);
    } // else we couldn't figure out what the user wanted to select, so leave it as is
    _.set(clone, editKeySet, undefined);

    updateProfile(clone);
    if (_.isFunction(onChange)) {
      onChange(clone);
    }
  };

  let selectedValue = _.get(profile, keySet);
  let selectedOption = options.find(option => option.value === selectedValue);
  let onUpdateInput = searchText => {
    let clone = _.cloneDeep(profile);
    _.set(clone, editKeySet, searchText);
    _.set(clone, keySet, null);
    updateProfile(clone);
  };
  let onBlur = () => {
    // clear the edit value when we lose focus. In its place we will display
    // the selected option label if one is selected, or an empty string
    let clone = _.cloneDeep(profile);
    _.set(clone, editKeySet, undefined);
    updateProfile(clone);
  };

  let convertOption = option => ({
    text: option.label,
    value: <MenuItem key={option.value} primaryText={option.label} value={option.value}/>
  });

  let searchText;
  let editText = _.get(profile, editKeySet);
  if (editText !== undefined) {
    searchText = editText;
  } else if (selectedOption) {
    searchText = selectedOption.label;
  } else {
    searchText = "";
  }


  return (
    <AutoComplete
      ref="autocomplete"
      animated={false}
      menuCloseDelay={0}
      filter={caseInsensitivePrefixFilter}
      dataSource={options.map(convertOption)}
      searchText={searchText}
      floatingLabelText={label}
      openOnFocus={true}
      menuStyle={{maxHeight: 300}}
      fullWidth={true}
      onNewRequest={onNewRequest}
      onUpdateInput={onUpdateInput}
      onBlur={onBlur}
      errorText={_.get(errors, keySet)}
    />
  );
}

// HACK: we need to import the function above to allow us to mock it for testing
import { boundSelectField as mockedBoundSelectField } from './profile_edit';

/**
 * Bind this to this.boundStateSelectField in the constructor of a form component
 * to update select fields
 *
 * @param stateKeySet {String[]} Path to the state field
 * @param countryKeySet {String[]} Path to the country field
 * @param label {String} The label of the field
 * @returns {ReactElement}
 */
export function boundStateSelectField(stateKeySet, countryKeySet, label) {
  const {
    profile,
  } = this.props;
  let options = [];
  let country = _.get(profile, countryKeySet);
  if (iso3166.data[country] !== undefined) {
    options = Object.keys(iso3166.data[country].sub).map(code => ({
      value: code,
      label: iso3166.data[country].sub[code].name
    }));
    options = _.sortBy(options, 'label');
  }

  return mockedBoundSelectField.call(this, stateKeySet, label, options);
}

/**
 * Bind this to this.boundCountrySelectField in the constructor of a form component
 * to update select fields
 *
 * @param stateKeySet {String[]} Path to the state field
 * @param countryKeySet {String[]} Path to the country field
 * @param label {String} The label of the field
 * @returns {ReactElement}
 */
export function boundCountrySelectField(stateKeySet, countryKeySet, label) {
  const {
    updateProfile,
  } = this.props;

  const onChange = newProfile => {
    // clear state field when country field changes
    let clone = _.cloneDeep(newProfile);
    _.set(clone, stateKeySet, null);
    updateProfile(clone);
  };

  return mockedBoundSelectField.call(this, countryKeySet, label, this.countryOptions, onChange);
}

/**
 * bind this to this.boundDateField in the constructor of a form component
 * to update date fields
 * pass in the name (used as placeholder), key for profile.
 *
 * @param keySet {String[]} Path to look up and set a field
 * @param label {String} Label for the field
 * @param omitDay {bool} If false, there is a date textbox in addition to month and year
 * @returns {ReactElement}
 */
export function boundDateField(keySet, label, omitDay) {
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

  return <div style={{paddingBottom: "20px"}}>
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
 * Saves the profile and returns a promise, taking an optional function
 * to retrieve keys for validation of nested fields (e.g. profile.work_history)
 *
 * @param isLastStep {bool} If true, this is the last tab in the profile
 */
export function saveProfileStep(isLastStep=false) {
  const { saveProfile, profile } = this.props;
  let clone = Object.assign({}, profile, {
    filled_out: profile.filled_out || isLastStep
  });
  if (isLastStep) {
    // user has also seen email consent message at this point
    clone.email_optin = true;
  }
  return saveProfile(clone);
}

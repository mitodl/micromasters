import React from 'react';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import iso3166 from 'iso-3166-2';
import _ from 'lodash';
import AutoComplete from '../components/AutoComplete';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';

import { DATE_FORMAT } from '../constants';
import {
  validateMonth,
  validateYear,
} from '../util/util';

// utility functions for pushing changes to profile forms back to the
// redux store.
// this expects that the `updateProfile` and `profile` props are passed
// in to whatever component it is used in.

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
    if (onChange !== undefined) {
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
 * @returns {ReactElement}
 */
export function boundDateField(keySet, label) {
  const {
    profile,
    errors,
    updateProfile,
  } = this.props;

  let onChange = date => {
    let clone = _.cloneDeep(profile);
    // format as ISO-8601
    let newDate = _.isNull(date) ? date : date.format(DATE_FORMAT);
    _.set(clone, keySet, newDate);
    updateProfile(clone);
  };
  let newDate = _.get(profile, keySet) ? moment(_.get(profile, keySet), DATE_FORMAT) : null;
  return <div>
    <DatePicker
      selected={newDate}
      placeholderText={label}
      showYearDropdown
      onChange={onChange}
    />
    <span className="validation-error-text">{_.get(errors, keySet)}</span>
  </div>;
}

/**
 * bind this to this.boundMonthYearField in the constructor of a form component
 * to update date fields
 * pass in the name (used as placeholder), key for profile.
 *
 * @param keySet {String[]} Path to look up and set a field
 * @param label {String} Label for the field
 * @returns {ReactElement}
 */
export function boundMonthYearField(keySet, label) {
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
      return moment(formattedDate, DATE_FORMAT);
    }
    return null;
  };

  // Get a tuple { month, year } which contains the values being edited in the textbox
  // values may be strings or numbers. Otherwise return empty object.
  let getMonthYear = () => {
    let monthYear = _.get(profile, editKeySet, {});

    if (_.isEmpty(monthYear)) {
      let date = getDate();
      if (date !== null && date.isValid()) {
        return {
          month: date.month() + 1,
          year: date.year()
        };
      }
    }
    return monthYear;
  };

  // Given text values month and year, update the formatted date in the profile
  // if month and year are filled out. If one or both are invalid, store the text
  // representation instead in a temporary edit value and store null in place of the
  // date format.
  let setNewDate = (month, year) => {
    let clone = _.cloneDeep(profile);

    let monthYear = getMonthYear();
    // Update monthYear with the typed text. Typically only month or year will
    // have text at a time since the user can't edit two fields at once, so we need
    // to look in the state to see
    let newMonthYear = Object.assign({}, monthYear, {
      year: year !== undefined ? year : monthYear.year,
      month: month !== undefined ? month : monthYear.month
    });

    // these functions return undefined if month or year is invalid, and converts the value to a number
    let validatedMonth = validateMonth(newMonthYear.month);
    let validatedYear = validateYear(newMonthYear.year);

    if (validatedMonth === undefined || validatedYear === undefined) {
      // store the edit value and make the formatted date null so it doesn't pass validation
      _.set(clone, editKeySet, newMonthYear);
      _.set(clone, keySet, undefined);
    } else if ( validatedMonth === "" || validatedYear === "") {
      _.set(clone, editKeySet, undefined);
      _.set(clone, keySet, null);
    } else {
      // format date and store it, and erase the edit data
      let formattedDate = moment().
        set('year', validatedYear).
        set('month', validatedMonth - 1).
        set('date', 1).
        format(DATE_FORMAT);
      _.set(clone, editKeySet, undefined);
      _.set(clone, keySet, formattedDate);
    }
    updateProfile(clone);
  };

  let monthYear = getMonthYear();

  // fullWidth means set width = 100% instead of 256px
  return <div>
    <label>{label}</label>
    <span> </span>
    <TextField
      floatingLabelText="MM"
      style={{
        maxWidth: "2em"
      }}
      fullWidth={true}
      value={monthYear.month !== undefined ? monthYear.month : ""}
      onChange={e => setNewDate(e.target.value, undefined)}
    />
    <span className="slash"> / </span>
    <TextField
      floatingLabelText="YYYY"
      style={{
        maxWidth: "4em"
      }}
      fullWidth={true}
      value={monthYear.year !== undefined ? monthYear.year : ""}
      onChange={e => setNewDate(undefined, e.target.value)}
    />
    <span className="validation-error-text">{_.get(errors, keySet)}</span>
  </div>;
}


/**
 * Saves the profile and returns a promise, taking an optional function
 * to retrieve keys for validation of nested fields (e.g. profile.work_history)
 *
 * @param nestedValidationCallback {func} If present, a function to retrieve validation fields
 * @param finalStep {bool} If true, this is the last tab in the profile
 */
export function saveAndContinue(nestedValidationCallback, finalStep) {
  const {
    saveProfile,
    profile,
    requiredFields,
    validationMessages
  } = this.props;

  let fields;
  if ( _.isFunction(nestedValidationCallback) ) {
    fields = nestedValidationCallback(profile, requiredFields);
  } else {
    fields = requiredFields;
  }

  let clone = Object.assign({}, profile, {
    filled_out: !!finalStep
  });
  if (finalStep) {
    // user has also seen email consent message at this point
    clone.email_optin = true;
  }

  return saveProfile(clone, fields, validationMessages);
}

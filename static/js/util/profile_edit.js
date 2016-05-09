import React from 'react';
import TextField from 'react-mdl/lib/Textfield';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import Button from 'react-mdl/lib/Button';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import moment from 'moment';
import iso3166 from 'iso-3166-2';
import _ from 'lodash';
import { DATE_FORMAT } from '../constants';

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
  return (
    <TextField
      floatingLabel
      label={label}
      value={_.get(profile, keySet, "")}
      error={_.get(errors, keySet)}
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
 * @returns {ReactElement}
 */
export function boundSelectField(keySet, label, options) {
  const {
    profile,
    errors,
    updateProfile,
  } = this.props;
  let onChange = value => {
    let clone = _.cloneDeep(profile);
    _.set(clone, keySet, value? value.value : '');
    updateProfile(clone);
  };
  return <div>
    <Select
      options={options}
      value={_.get(profile, keySet)}
      placeholder={label}
      onChange={onChange} />
    <span className="validation-error-text">{_.get(errors, keySet)}</span>
  </div>;
}


/**
 * Bind this to this.boundStateSelectField in the constructor of a form component
 * to update select fields
 * pass in the name (used as placeholder), key for profile, and the options.
 *
 * @param stateKeySet {String[]} Path to the state field
 * @param countryKeySet {String[]} Path to the country field
 * @param label {String} The label of the field
 * @returns {ReactElement}
 */
export function boundStateSelectField(stateKeySet, countryKeySet, label) {
  const {
    updateProfile,
    errors,
    profile,
  } = this.props;
  let onChange = value => {
    let clone = _.cloneDeep(profile);
    _.set(clone, stateKeySet, value ? value.value : null);
    updateProfile(clone);
  };
  let options = [];
  let country = _.get(profile, countryKeySet);
  if (iso3166.data[country] !== undefined) {
    options = Object.keys(iso3166.data[country].sub).map(code => ({
      value: code,
      label: iso3166.data[country].sub[code].name
    }));
    options = _.sortBy(options, 'label');
  }

  return <div>
    <Select
      options={options}
      value={_.get(profile, stateKeySet)}
      placeholder={label}
      onChange={onChange} />
    <span className="validation-error-text">{_.get(errors, stateKeySet)}</span>
  </div>;
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
    _.set(clone, keySet, date.format(DATE_FORMAT));
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
 * Validate a month number
 * @param {String} string The input string
 * @returns {Number|undefined} The valid month or undefined if not valid
 */
export function validateMonth(string) {
  let month = parseInt(string, 10);
  if (isNaN(month)) {
    return undefined;
  }
  if (month < 1 || month > 12) {
    return undefined;
  }
  return month;
}

/**
 * Validate a year
 * @param {String} string The input string
 * @returns {Number|undefined} The valid year or undefined if not valid
 */
export function validateYear(string) {
  let year = parseInt(string, 10);
  if (isNaN(year)) {
    return undefined;
  }
  if (year < 1 || year > 9999) {
    // fit into YYYY format
    return undefined;
  }
  return year;
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

  let getDate = () => _.get(profile, keySet) ? moment(_.get(profile, keySet), "YYYY-MM-DD") : null;

  let setNewDate = (month, year) => {
    month = validateMonth(month);
    year = validateYear(year);

    let date = getDate();
    let clone = _.cloneDeep(profile);
    // format as ISO-8601
    if (date === null) {
      date = moment();
    }
    // use first day of the month which will exist on any month
    date.set('date', 1);
    date.set('month', month);
    date.set('year', year);

    _.set(clone, keySet, date.format("YYYY-MM-DD"));
    updateProfile(clone);
  };

  let clearDate = () => {
    let clone = _.cloneDeep(profile);
    _.set(clone, keySet, null);
    updateProfile(clone);
  };

  let date = getDate();

  return <div className="month-year-field">
    <label>{label}</label> <TextField
      className="month-field"
      floatingLabel
      label="MM"
      value={date ? (date.month() + 1) : ""}
      onChange={e => setNewDate(e.target.value, undefined)}
    /> <span className="slash">/</span> <TextField
      floatingLabel
      className="year-field"
      label="YYYY"
      value={date ? date.year() : ""}
      onChange={e => setNewDate(undefined, e.target.value)}
    />

    <span className="validation-error-text">{_.get(errors, keySet)}</span>
    <button
      className="glyphicon glyphicon-remove"
      onClick={clearDate}
      style={{
        border: "none",
        background: "none"
      }}
    />
  </div>;
}


/**
 * Bind to this.saveAndContinue.bind(this, '/next/url')
 * pass an option callback if you need nested validation
 * (see EmploymentTab for an example)
 *
 * @param next {String} URL to redirect to after successful validation
 * @param nestedValidationCallback {func} If present, a function to retrieve validation fields
 */
export function saveAndContinue(next, nestedValidationCallback) {
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

  saveProfile( profile, fields, validationMessages).then(() => {
    this.context.router.push(next);
  });
}

/**
 * Allows editing an array of objects stored in the profile
 * 
 * @param arrayName {String} key the array is stored under on the profile
 * @param blankEntry {Object} an object with the requisite fields, with undefined, "", or null values
 * @param formCallback {func} a function that takes an index (into the object array) and draws
 * ui (using boundTextField and so on) to edit an object in the array
 * @returns {ReactElement}
 */
export function editProfileObjectArray (arrayName, blankEntry, formCallback) {
  const { updateProfile, profile } = this.props;
  if ( profile.hasOwnProperty(arrayName) && !_.isEmpty(profile[arrayName]) ) {
    let editForms = profile[arrayName].map((v, i) => formCallback(i));
    let addAnotherBlankEntry = () => {
      let clone = Object.assign({}, profile);
      clone[arrayName] = clone[arrayName].concat(blankEntry);
      updateProfile(clone);
    };
    editForms.push(
      <Grid className="profile-tab-grid" key={arrayName}>
        <Cell col={12} align='middle'>
          <Button onClick={addAnotherBlankEntry}>
            Add another entry
          </Button>
        </Cell>
      </Grid>
    );
    return editForms;
  } else {
    let startEditing = () => {
      let clone = Object.assign({}, profile);
      clone[arrayName] = [blankEntry];
      updateProfile(clone);
    };
    return (
      <Grid className="profile-tab-grid">
        <Cell col={12} align='middle'>
          <Button onClick={startEditing}>
            Start Editing
          </Button>
        </Cell>
      </Grid>
    );
  }
}

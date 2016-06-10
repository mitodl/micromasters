import _ from 'lodash';
import moment from 'moment';

import { filterPositiveInt } from './util';
import { HIGH_SCHOOL, EDUCATION_LEVELS } from '../constants';

let handleNestedValidation = (profile, keys, nestedKey) => {
  let nestedFields = index => (
    keys.map(key => [nestedKey, index, key])
  );
  return _.flatten(profile[nestedKey].map((v, i) => nestedFields(i)));
};

let isNilOrEmptyString = val => _.isNil(val) || val === "";

let checkFieldPresence = (profile, requiredFields, messages) => {
  let errors = {};

  for (let keySet of requiredFields) {
    let val = _.get(profile, keySet);
    if (isNilOrEmptyString(val)) {
      _.set(errors, keySet,  messages[keySet.slice(-1)[0]]);
    }
  }
  return errors;
};

export function personalValidation(profile) {
  let requiredFields = [
    ['first_name'],
    ['last_name'],
    ['preferred_name'],
    ['gender'],
    ['preferred_language'],
    ['city'],
    ['state_or_territory'],
    ['country'],
    ['birth_city'],
    ['birth_state_or_territory'],
    ['birth_country'],
    ['date_of_birth'],
  ];
  let validationMessages = {
    'first_name': "Given name is required",
    'last_name': "Family name is required",
    'preferred_name': "Preferred name is required",
    'gender': "Gender is required",
    'preferred_language': "Preferred language is required",
    'city': "City is required",
    'state_or_territory': 'State or Territory is required',
    'country': "Country is required",
    'birth_city': 'City is required',
    'birth_state_or_territory': 'State or Territory is required',
    'birth_country': "Country is required",
    'date_of_birth': 'Please enter a valid date of birth'
  };
  let errors = checkFieldPresence(profile, requiredFields, validationMessages);
  if (!moment(profile.date_of_birth).isBefore(moment(), 'day')) {
    // birthdays must be before today
    errors.date_of_birth = validationMessages.date_of_birth;
  }
  return errors;
}

export function educationValidation(profile) {
  let messages = {
    'degree_name': 'Degree level is required',
    'graduation_date': 'Please enter a valid graduation date',
    'field_of_study': 'Field of study is required',
    'online_degree': 'Online Degree is required',
    'school_name': 'School name is required',
    'school_city': 'City is required',
    'school_state_or_territory': 'State is required',
    'school_country': 'Country is required'
  };
  let nestedKeys = [
    'degree_name',
    'graduation_date',
    'field_of_study',
    'online_degree',
    'school_name',
    'school_city',
    'school_state_or_territory',
    'school_country'
  ];
  if (!_.isEmpty(profile.education)) {
    let requiredFields = handleNestedValidation(profile, nestedKeys, 'education');
    requiredFields = requiredFields.filter(([, index, key]) =>
      // don't require field of study for high school students
      !(key === 'field_of_study' && _.get(profile, ['education', index, 'degree_name']) === HIGH_SCHOOL)
    );
    return checkFieldPresence(profile, requiredFields, messages);
  } else {
    return {};
  }
}

export function educationUiValidation(profile, ui) {
  if (profile.education === undefined) {
    profile = Object.assign({}, profile, {
      education: []
    });
  }

  let errors = {};
  for (let {value, label} of EDUCATION_LEVELS) {
    let items = profile.education.filter(education => education.degree_name === value);
    if (ui.educationDegreeInclusions[value] && items.length === 0) {
      errors[`education_${value}_required`] = `${label} is required if switch is set`;
    }
  }
  return errors;
}

export function employmentValidation(profile) {
  let messages = {
    'position': 'Position is required',
    'industry': 'Industry is required',
    'company_name': 'Company Name is required',
    'start_date': 'Please enter a valid start date',
    'city': 'City is required',
    'country': 'Country is required',
    'state_or_territory': 'State or Territory is required',
  };
  let nestedKeys = [
    'position',
    'industry',
    'company_name',
    'start_date',
    'city',
    'country',
    'state_or_territory',
  ];
  if (!_.isEmpty(profile.work_history)) {
    let requiredFields = handleNestedValidation(profile, nestedKeys, 'work_history');
    let errors = checkFieldPresence(profile, requiredFields, messages);

    for (let [index, workHistory] of Object.entries(profile.work_history)) {
      if (!isNilOrEmptyString(workHistory.end_date) &&
        moment(workHistory.end_date).isBefore(workHistory.start_date, 'month')) {
        _.set(errors, ['work_history', index, 'end_date'], "End date cannot be before start date");
      }
      let editIsEmpty = _.isEmpty(workHistory.end_date_edit) || (
        isNilOrEmptyString(workHistory.end_date_edit.year) &&
        isNilOrEmptyString(workHistory.end_date_edit.month)
      );
      if (isNilOrEmptyString(workHistory.end_date) && !editIsEmpty) {
        _.set(errors, ['work_history', index, 'end_date'], "Please enter a valid end date or leave it blank");
      }
    }

    return errors;
  } else {
    return {};
  }
}

export function employmentUiValidation(profile, ui) {
  if (ui.workHistoryEdit && _.isEmpty(profile.work_history)) {
    return {
      work_history_required: "Work history is required if switch is set"
    };
  } else {
    return {};
  }
}

export function privacyValidation(profile) {
  let requiredFields = [
    ['account_privacy']
  ];
  let messages = {
    'account_privacy': 'Privacy level is required'
  };
  return checkFieldPresence(profile, requiredFields, messages);
}

/*
check that the profile is complete. we make the assumption that a
complete profile consists of:
  - a valid personal tab
  - one or more education items, for the education types the user has marked
  - one or more work items if the user has marked any work history
  - a valid privacy level
*/
export function validateProfileComplete(profile) {
  let errors = {};

  // check personal tab
  errors = personalValidation(profile);
  if (!_.isEqual(errors, {})) {
    return [false, '/profile/personal', errors];
  }

  // check professional tab
  if (_.isArray(profile.work_history) && !_.isEmpty(profile.work_history)) {
    errors = employmentValidation(profile);
    if (!_.isEqual(errors, {})) {
      return [false, '/profile/professional', errors];
    }
  }

  // check education tab
  if (_.isArray(profile.education) && !_.isEmpty(profile.education)) {
    errors = educationValidation(profile);
    if (!_.isEqual(errors, {})) {
      return [false, '/profile/education', errors];
    }
  }

  // check privacy tab
  errors = privacyValidation(profile);
  if (!_.isEqual(errors, {})) {
    return [false, '/profile/privacy', errors];
  }

  return [true, null, null];
}

/**
 * Validate a day of month
 * @param {String} string The input string
 * @returns {Number|undefined} The valid date if a valid date value or undefined if not valid
 */
export function validateDay(string) {
  let date = filterPositiveInt(string);
  if (date === undefined) {
    return undefined;
  }
  // More complicated cases like Feb 29 are handled in moment.js isValid
  if (date < 1 || date > 31) {
    return undefined;
  }
  return date;
}

/**
 * Validate a month number
 * @param {String} string The input string
 * @returns {Number|undefined} The valid month if a valid month value or undefined if not valid
 */
export function validateMonth(string) {
  let month = filterPositiveInt(string);
  if (month === undefined) {
    return undefined;
  }
  if (month < 1 || month > 12) {
    return undefined;
  }
  return month;
}

/**
 * Validate a year string is an integer and fits into YYYY
 * @param {String} string The input string
 * @returns {Number|undefined} The valid year if a valid year value or undefined if not valid
 */
export function validateYear(string) {
  let year = filterPositiveInt(string);
  if (year === undefined) {
    return undefined;
  }
  if (year < 1800 || year >= 2100) {
    // fit into YYYY format
    return undefined;
  }
  return year;
}

/**
 * Returns a function which merges the results of the given functions on a set of arguments
 * @param validators {Array} A list of validator functions taking (profile, ui)
 * @returns {function()} A function taking (profile, ui) which combines the outputs of the validators
 */
export function combineValidators(...validators) {
  return (...args) => _.merge({}, ...validators.map(
    validator => validator(...args)
  ));
}

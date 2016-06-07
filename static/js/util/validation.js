import _ from 'lodash';

import { filterPositiveInt } from './util';
import { HIGH_SCHOOL } from '../constants';

let handleNestedValidation = (profile, keys, nestedKey) => {
  let nestedFields = index => (
    keys.map(key => [nestedKey, index, key])
  );
  return _.flatten(profile[nestedKey].map((v, i) => nestedFields(i)));
};

let checkFieldPresence = (profile, requiredFields, messages) => {
  let errors = {};

  for (let keySet of requiredFields) {
    let val = _.get(profile, keySet);
    if (_.isUndefined(val) || _.isNull(val) || val === "" ) {
      _.set(errors, keySet,  `${messages[keySet.slice(-1)[0]]} is required`);
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
    'first_name': "Given name",
    'last_name': "Family name",
    'preferred_name': "Preferred name",
    'gender': "Gender",
    'preferred_language': "Preferred language",
    'city': "City",
    'state_or_territory': 'State or Territory',
    'country': "Country",
    'birth_city': 'City',
    'birth_state_or_territory': 'State or Territory',
    'birth_country': "Country",
    'date_of_birth': "Date of birth"
  };
  return checkFieldPresence(profile, requiredFields, validationMessages);
}

export function educationValidation(profile) {
  let messages = {
    'degree_name': 'Degree level',
    'graduation_date': 'Graduation Date',
    'field_of_study': 'Field of study',
    'online_degree': 'Online Degree',
    'school_name': 'School name',
    'school_city': 'City',
    'school_state_or_territory': 'State',
    'school_country': 'Country'
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
  if ( !_.isEmpty(profile.education) ) {
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

export function employmentValidation(profile) {
  let messages = {
    'position': 'Position',
    'industry': 'Industry',
    'company_name': 'Company Name',
    'start_date': 'Start Date',
    'city': 'City',
    'country': 'Country',
    'state_or_territory': 'State or Territory',
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
  if ( !_.isEmpty(profile.work_history) ) {
    let requiredFields = handleNestedValidation(profile, nestedKeys, 'work_history');
    return checkFieldPresence(profile, requiredFields, messages);
  } else {
    return {};
  }
}

export function privacyValidation(profile) {
  let requiredFields = [
    ['account_privacy']
  ];
  let messages = {
    'account_privacy': 'Privacy level'
  };
  return checkFieldPresence(profile, requiredFields, messages);
}

/**
 * Validates the profile
 *
 * @param {Object} profile The user profile
 * @returns {Object} Validation errors or an empty object if no errors
 */
export function validateProfile(profile) {
  return Object.assign(
    {},
    personalValidation(profile),
    educationValidation(profile),
    employmentValidation(profile),
    privacyValidation(profile),
  );
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
  if (year < 1 || year > 9999) {
    // fit into YYYY format
    return undefined;
  }
  return year;
}

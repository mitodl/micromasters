// @flow
import _ from 'lodash';
import moment from 'moment';

import type {
  Profile,
  WorkHistoryEntry,
  ValidationErrors
} from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { Email } from '../flow/emailTypes';
import { filterPositiveInt } from './util';
import {
  HIGH_SCHOOL,
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
} from '../constants';
import { S } from './sanctuary';
const { Maybe, Nothing } = S;

let handleNestedValidation = (profile: Profile, keys, nestedKey: string) => {
  let nestedFields = index => (
    keys.map(key => [nestedKey, index, key])
  );
  return _.flatten(profile[nestedKey].map((v, i) => nestedFields(i)));
};

let isNilOrEmptyString = (val: any): boolean => (
  val === null || val === undefined || val === ""
);

let checkFieldPresence = (profile, requiredFields, messages: any): ValidationErrors => {
  let errors = {};

  for (let keySet of requiredFields) {
    let val = _.get(profile, keySet);
    if (isNilOrEmptyString(val)) {
      _.set(errors, keySet,  messages[keySet.slice(-1)[0]]);
    }
  }
  return errors;
};

export type Validator = (a: Profile) => ValidationErrors;
export type UIValidator = (a: Profile, b: UIState) => ValidationErrors;

export function personalValidation(profile: Profile): ValidationErrors {
  let requiredFields = [
    ['first_name'],
    ['last_name'],
    ['preferred_name'],
    ['gender'],
    ['preferred_language'],
    ['city'],
    ['state_or_territory'],
    ['country'],
    ['nationality'],
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
    'birth_country': "Country is required",
    'nationality': "Nationality is required",
    'date_of_birth': 'Please enter a valid date of birth'
  };
  let errors = checkFieldPresence(profile, requiredFields, validationMessages);
  if (!moment(profile.date_of_birth).isBefore(moment(), 'day')) {
    // birthdays must be before today
    errors.date_of_birth = validationMessages.date_of_birth;
  }
  return errors;
}

export function educationValidation(profile: Profile): ValidationErrors {
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

export type WorkEntry = [string, WorkHistoryEntry];
export function employmentValidation(profile: Profile): ValidationErrors {
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

    profile.work_history.forEach((workHistory, index) => {
      if (!isNilOrEmptyString(workHistory.end_date) && workHistory.end_date !== undefined &&
        moment(workHistory.end_date).isBefore(workHistory.start_date, 'month')) {
        _.set(errors, ['work_history', String(index), 'end_date'], "End date cannot be before start date");
      }
      let editIsEmpty = _.isEmpty(workHistory.end_date_edit) || (
        workHistory.end_date_edit !== undefined &&
        isNilOrEmptyString(workHistory.end_date_edit.year) &&
          isNilOrEmptyString(workHistory.end_date_edit.month)
      );
      if (isNilOrEmptyString(workHistory.end_date) && !editIsEmpty) {
        _.set(errors, ['work_history', String(index), 'end_date'], "Please enter a valid end date or leave it blank");
      }
    });

    return errors;
  } else {
    return {};
  }
}

export function privacyValidation(profile: Profile): ValidationErrors {
  let requiredFields = [
    ['account_privacy']
  ];
  let messages = {
    'account_privacy': 'Privacy level is required'
  };
  return checkFieldPresence(profile, requiredFields, messages);
}

/**
 * validate an email for presence of the 'subject' and 'body' fields
 */
export function emailValidation(email: Email): ValidationErrors {
  let requiredFields = [ ['subject'], ['body'] ];
  let messages = {
    'subject': 'Please fill in a subject',
    'body': 'Please fill in a body',
  };
  return checkFieldPresence(email, requiredFields, messages);
}

/*
check that the profile is complete. we make the assumption that a
complete profile consists of:
  - a valid personal tab
  - one or more education items, for the education types the user has marked
  - one or more work items if the user has marked any work history
  - a valid privacy level
*/
export type ProfileComplete = [boolean, string|null, ValidationErrors];
export function validateProfileComplete(profile: Profile): ProfileComplete {
  let errors = {};

  // check personal tab
  errors = personalValidation(profile);
  if (!_.isEqual(errors, {})) {
    return [false, PERSONAL_STEP, errors];
  }

  // check professional tab
  if (_.isArray(profile.work_history) && !_.isEmpty(profile.work_history)) {
    errors = employmentValidation(profile);
    if (!_.isEqual(errors, {})) {
      return [false, EMPLOYMENT_STEP, errors];
    }
  }

  // check education tab
  if (_.isArray(profile.education) && !_.isEmpty(profile.education)) {
    errors = educationValidation(profile);
    if (!_.isEqual(errors, {})) {
      return [false, EDUCATION_STEP, errors];
    }
  }

  return [true, null, {}];
}

/**
 * Validate a day of month
 */
export function validateDay(input: string): Maybe<number> {
  let sanitized = sanitizeDate(input, 2);
  let date = filterPositiveInt(sanitized);
  if (date === undefined) {
    return Nothing();
  }
  // More complicated cases like Feb 29 are handled in moment.js isValid
  if (date > 31) {
    return Maybe.of(31);
  }
  return Maybe.of(date);
}

/**
 * Removes non-numeric characters and truncates output string
 */
export function sanitizeDate(input: string|number, length: number): string {
  if ( typeof input === 'string' ) {
    let out = input.replace(/[^\d]+/g, '');
    if ( out.match(/^0+/) ) {
      if ( out.length <= length ) {
        return out.slice(0, length);
      } else {
        return out.replace(/^0+/, "").slice(0, length);
      }
    } else {
      return out.slice(0, length);
    }
  } else {
    return String(input).slice(0, length);
  }
}
/**
 * Validate a month number
 */
export function validateMonth(input: string|number): Maybe<number> {
  let sanitized = sanitizeDate(input, 2);
  let month = filterPositiveInt(sanitized);
  if (month === undefined) {
    return Nothing();
  }
  if (month > 12) {
    return Maybe.of(12);
  }
  return Maybe.of(month);
}

/**
 * Validate a year string is an integer and fits into YYYY
 */
export function validateYear(input: string|number|null): Maybe<number> {
  if ( input === null ) {
    return Nothing();
  }
  let sanitized = sanitizeDate(input, 4);
  let year = filterPositiveInt(sanitized);
  if (year === undefined) {
    return Nothing();
  }
  if ( year < 1800 ) {
    if ( String(year).length < 4 ) {
      return Maybe.of(year);
    }
    return Maybe.of(1800);
  }
  if ( year >= 2100) {
    return Maybe.of(2100);
  }
  return Maybe.of(year);
}

/**
 * Returns a function which merges the results of the given functions on a set of arguments
 */
export function combineValidators(...validators: Array<Function>): Function {
  return (...args) => _.merge({}, ...validators.map(
    validator => validator(...args)
  ));
}

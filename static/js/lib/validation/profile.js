// @flow
import _ from 'lodash';
import moment from 'moment';
import R from 'ramda';

import type {
  Profile,
  ValidationErrors,
  EducationEntry,
  WorkHistoryEntry,
} from '../../flow/profileTypes';
import type { UIState } from '../../reducers/ui';
import type { Email } from '../../flow/emailTypes';
import type {
  FinancialAidState,
  FinancialAidValidation,
} from '../../reducers/financial_aid';
import {
  HIGH_SCHOOL,
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
  CP1252_REGEX
} from '../../constants';
import { shouldRenderRomanizedFields } from '../../util/profile_edit';

type ErrorMessages = {[key: string]: string};

let isNilOrEmptyString = (val: any): boolean => (
  val === null || val === undefined || val === ""
);

const filledOutFields = R.compose(R.keys, R.reject(isNilOrEmptyString));

const findErrors = (input: Object, requiredKeys: string[], messages: ErrorMessages) => (
  R.pick(R.difference(requiredKeys, filledOutFields(input)), messages)
);

export type Validator = (a: Profile) => ValidationErrors;
export type UIValidator = (a: Profile, b: UIState) => ValidationErrors;

/*
 * Program Selector Validation
 */
export function programValidation(_: Profile, ui: UIState): ValidationErrors {
  let { selectedProgram } = ui;
  let errors = {};

  if (!selectedProgram) {
    errors.program = 'Please select a valid program';
  }

  return errors;
}

/*
 * Profile Image Validator
 */
export const profileImageValidation = () => ({});

/*
 * Personal Validation
 */
const personalMessages: ErrorMessages = {
  'first_name': "Given name is required",
  'last_name': "Family name is required",
  'preferred_name': "Nickname / Preferred name is required",
  'gender': "Gender is required",
  'preferred_language': "Preferred language is required",
  'city': "City is required",
  'state_or_territory': 'State or Territory is required',
  'country': "Country is required",
  'birth_country': "Country is required",
  'nationality': "Nationality is required",
  'date_of_birth': 'Please enter a valid date of birth'
};

export const personalValidation = (profile: Profile) => {
  let errors = findErrors(profile, R.keys(personalMessages), personalMessages);
  if (!moment(profile.date_of_birth).isBefore(moment(), 'day')) {
    errors.date_of_birth = personalMessages.date_of_birth;
  }
  if (shouldRenderRomanizedFields(profile)) {
    if (!profile.romanized_first_name || !CP1252_REGEX.test(profile.romanized_first_name)) {
      errors.romanized_first_name = "Latin first name is required";
    }

    if (!profile.romanized_last_name || !CP1252_REGEX.test(profile.romanized_last_name)) {
      errors.romanized_last_name = "Latin last name is required";
    }
  }
  return errors;
};

/*
 * Helper for nested validators
 * key is the top level key on profile
 * findErrors is a function which return an error object
 * profile is, well, a profile
 */
const nestedValidator = R.curry((key: string, findErrors: Function, profile: Profile) => {
  if (R.isEmpty(profile[key]) || R.isNil(profile[key])) {
    return {};
  }
  let errors = findErrors(profile[key]);
  if ( R.equals(errors, R.repeat({}, errors.length)) ) {
    return {};
  }
  return { [key]: errors };
});

/*
 * Education Validation
 */
const educationMessages: ErrorMessages = {
  'degree_name': 'Degree level is required',
  'graduation_date': 'Please enter a valid graduation date',
  'field_of_study': 'Field of study is required',
  'online_degree': 'Online Degree is required',
  'school_name': 'School name is required',
  'school_city': 'City is required',
  'school_state_or_territory': 'State is required',
  'school_country': 'Country is required'
};

const isHighSchool: (e: EducationEntry) => boolean = R.compose(
  R.equals(HIGH_SCHOOL), R.prop('degree_name')
);

const excludeFieldOfStudy: (k: string[]) => string[] = R.filter(
  R.compose(R.not, R.equals('field_of_study'))
);

const educationKeys: (e: EducationEntry) => string[] = R.ifElse(
  isHighSchool, R.compose(excludeFieldOfStudy, R.keys), R.keys
);

const educationErrors: (es: EducationEntry[]) => ValidationErrors[] = R.map(entry => (
  findErrors(entry, educationKeys(entry), educationMessages)
));

export const educationValidation = nestedValidator('education', educationErrors);

/*
 * Work History Validation
 */
const workMessages: ErrorMessages = {
  'position': 'Position is required',
  'industry': 'Industry is required',
  'company_name': 'Name of Employer is required',
  'start_date': 'Please enter a valid start date',
  'city': 'City is required',
  'country': 'Country is required',
  'state_or_territory': 'State or Territory is required',
};

// functions to perform extra checks
// must be binary functions taking (entry, errors)
// where entry is a work history entry
// and errors is the output of workHistoryErrors
// and returning errors ∪ newErrors

const extraWorkCheck = R.curry((key, msg, predicate, entry, errors) => (
  predicate(entry) ? R.merge(errors, { [key]: msg }) : errors
));

const endDateNotBeforeStart = extraWorkCheck('end_date', "End date cannot be before start date", entry => (
  !isNilOrEmptyString(entry.end_date) && moment(entry.end_date).isBefore(entry.start_date, 'month')
));

const endDateNotInFuture = extraWorkCheck('end_date', 'End date cannot be in the future', entry => (
  moment(entry.end_date).isAfter(moment(), 'month')
));

const dateIsValid = extraWorkCheck('end_date', "Please enter a valid end date or leave it blank", entry => {
  let editIsEmpty = _.isEmpty(entry.end_date_edit) || (
    entry.end_date_edit !== undefined &&
    isNilOrEmptyString(entry.end_date_edit.year) &&
    isNilOrEmptyString(entry.end_date_edit.month)
  );
  return isNilOrEmptyString(entry.end_date) && !editIsEmpty;
});

const mergeListOfArgs = R.compose(R.mergeAll, (...errors) => [...errors]);

const additionalWorkValidation = R.converge(mergeListOfArgs, [
  endDateNotBeforeStart,
  endDateNotInFuture,
  dateIsValid
]);

const workHistoryErrors: (xs: WorkHistoryEntry[]) => ValidationErrors[] = R.map(entry => (
  additionalWorkValidation(entry, findErrors(entry, R.keys(workMessages), workMessages))
));

export const employmentValidation = nestedValidator('work_history', workHistoryErrors);

/*
 * Privacy Validation
 */
const privacyMessages: ErrorMessages = {
  'account_privacy': 'Privacy level is required'
};

export const privacyValidation = (profile: Profile): ValidationErrors => (
  findErrors(profile, R.keys(privacyMessages), privacyMessages)
);

/**
 * Email Validation
 * validate an email for presence of the 'subject' and 'body' fields
 */
let emailMessages: ErrorMessages = {
  'subject': 'Please fill in a subject',
  'body': 'Please fill in a body',
};

export const emailValidation = (email: Email): ValidationErrors => (
  findErrors(email, R.keys(emailMessages), emailMessages)
);

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
 * Returns a function which merges the results of the given functions on a set of arguments
 */
export function combineValidators(...validators: Array<Function>): Function {
  return (...args) => _.merge({}, ...validators.map(
    validator => validator(...args)
  ));
}

const financialAidMessages: ErrorMessages = {
  'income': 'Income is required',
  'currency': 'Please select a currency',
};

export const validateFinancialAid = (edit: FinancialAidState): FinancialAidValidation => {
  let errors: FinancialAidValidation = findErrors(edit, R.keys(financialAidMessages), financialAidMessages);
  if ( !edit.checkBox ) {
    errors['checkBox'] = 'You must agree to these terms';
  }
  return errors;
};

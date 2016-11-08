// @flow
import _ from 'lodash';
import moment from 'moment';

import type {
  Profile,
  WorkHistoryEntry,
  ValidationErrors
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
} from '../../constants';

let handleNestedValidation = (profile: Profile, keys, nestedKey: string) => {
  let nestedFields = index => (
    keys.map(key => [nestedKey, index, key])
  );
  return _.flatten(profile[nestedKey].map((v, i) => nestedFields(i)));
};

let isNilOrEmptyString = (val: any): boolean => (
  val === null || val === undefined || val === ""
);

let checkFieldPresence = (profile, requiredFields, messages: any) => {
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

export function programValidation(_: Profile, ui: UIState): ValidationErrors {
  let { selectedProgram } = ui;
  let errors = {};

  if (!selectedProgram) {
    errors.program = 'Please select a valid program';
  }

  return errors;
}

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
    'company_name': 'Name of Employer is required',
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
      if (!isNilOrEmptyString(workHistory.end_date) &&
        moment(workHistory.end_date).isBefore(workHistory.start_date, 'month')) {
        _.set(errors, ['work_history', String(index), 'end_date'], "End date cannot be before start date");
      }
      if (!isNilOrEmptyString(workHistory.end_date) &&
        moment(workHistory.end_date).isAfter(moment(), 'month')) {
        _.set(errors, ['work_history', String(index), 'end_date'], 'End date cannot be in the future');
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
 * Returns a function which merges the results of the given functions on a set of arguments
 */
export function combineValidators(...validators: Array<Function>): Function {
  return (...args) => _.merge({}, ...validators.map(
    validator => validator(...args)
  ));
}

export function validateFinancialAid(edit: FinancialAidState): FinancialAidValidation {
  let messages = {
    'income': 'Income is required',
    'currency': 'Please select a currency',
  };
  let required = Object.keys(messages).map(k => [k]);
  let errors: FinancialAidValidation = checkFieldPresence(edit, required, messages);
  if ( !edit.checkBox ) {
    errors['checkBox'] = 'You must agree to these terms';
  }
  return errors;
}

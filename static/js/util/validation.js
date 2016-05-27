import _ from 'lodash';

import { HIGH_SCHOOL } from '../constants';

let handleNestedValidation = (profile, keys, nestedKey) => {
  let nestedFields = index => (
    keys.map(key => [nestedKey, index, key])
  );
  return _.flatten(profile[nestedKey].map((v, i) => nestedFields(i)));
};

let checkFieldPresence = (profile, requiredFields, messages) => {
  return Object.assign({}, ...requiredFields.map( keySet => {
    let val = _.get(profile, keySet);
    if (_.isUndefined(val) || _.isNull(val) || val === "" ) {
      return _.set({}, keySet,  `${messages[keySet.slice(-1)[0]]} is required`);
    }
  }));
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

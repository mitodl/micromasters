// @flow
import _ from "lodash"
import moment from "moment"
import R from "ramda"
import PhoneNumber from "awesome-phonenumber"

import type {
  Profile,
  ValidationErrors,
  EducationEntry,
  WorkHistoryEntry
} from "../../flow/profileTypes"
import type { UIState } from "../../reducers/ui"
import type { EmailInputs } from "../../flow/emailTypes"
import type {
  FinancialAidState,
  FinancialAidValidation
} from "../../reducers/financial_aid"
import {
  HIGH_SCHOOL,
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP,
  CP1252_REGEX,
  INVALID_NAME_CHARS_REGEX
} from "../../constants"
import { shouldRenderRomanizedFields } from "../../util/profile_edit"

type ErrorMessages = { [key: string]: string }

export const isNilOrEmptyString = R.anyPass([R.isNil, R.test(/^\s*$/)])

const filledOutFields = R.compose(R.keys, R.reject(isNilOrEmptyString))

const findErrors = (
  input: Object,
  requiredKeys: string[],
  messages: ErrorMessages
) => R.pick(R.difference(requiredKeys, filledOutFields(input)), messages)

export const checkProp = R.curry((key, message, predicates, profile) => {
  if (R.propSatisfies(R.allPass(R.flatten([predicates])), key, profile)) {
    return {}
  }
  return { [key]: message }
})

const checkIsNotNilOrEmpty = checkProp(
  R.__,
  R.__,
  R.complement(isNilOrEmptyString)
)

export const mergeValidations = R.compose(
  R.converge(R.compose(R.mergeAll, Array.of)),
  Array.of
)

export const checkMaxLength = R.curry((key, label, maxLength, profile) =>
  checkProp(
    key,
    `${label} must be no more than ${maxLength} characters`,
    [
      R.complement(isNilOrEmptyString),
      R.pipe(R.toString, R.prop("length"), R.lte(R.__, maxLength))
    ],
    profile
  )
)

export type Validator = (a: Profile) => ValidationErrors
export type UIValidator = (a: Profile, b: UIState) => ValidationErrors

/*
 * Program Selector Validation
 */
export function programValidation(_: Profile, ui: UIState): ValidationErrors {
  let { selectedProgram } = ui
  let errors = {}

  if (!selectedProgram) {
    errors.program = "Please select a valid program"
  }

  return errors
}

/*
 * Profile Image Validator
 */
export const profileImageValidation = () => ({})

/*
 * Personal Validation
 */
const personalMessages: ErrorMessages = {
  first_name:         "Given name is required",
  last_name:          "Family name is required",
  preferred_name:     "Nickname / Preferred name is required",
  gender:             "Gender is required",
  preferred_language: "Preferred language is required",
  address:            "Street address is required",
  city:               "City is required",
  state_or_territory: "State or Territory is required",
  country:            "Country is required",
  birth_country:      "Country is required",
  nationality:        "Nationality is required",
  date_of_birth:      "Please enter a valid date of birth",
  phone_number:       "A phone number is required"
}

export const checkLatin = R.curry((key, label, profile) =>
  checkProp(
    key,
    `${label} must be in Latin characters`,
    [R.complement(isNilOrEmptyString), R.test(CP1252_REGEX)],
    profile
  )
)

export const checkInvalidNameChars = R.curry((key, label, profile) =>
  checkProp(
    key,
    `${label} must not contain comma, double quote, or greater than characters`,
    R.complement(R.test(INVALID_NAME_CHARS_REGEX)),
    profile
  )
)

export const checkDateOfBirth: Validator = checkProp(
  "date_of_birth",
  personalMessages.date_of_birth,
  [
    R.complement(isNilOrEmptyString),
    dob => moment(dob).isBefore(moment(), "day")
  ]
)

export const checkRomanizedNames: Validator = R.ifElse(
  shouldRenderRomanizedFields,
  mergeValidations(
    checkLatin("romanized_first_name", "Latin given name"),
    checkInvalidNameChars("romanized_first_name", "Latin given name"),
    checkMaxLength("romanized_first_name", "Latin given name", 30),
    checkIsNotNilOrEmpty(
      "romanized_first_name",
      "Latin given name is required"
    ),
    checkLatin("romanized_last_name", "Latin family name"),
    checkInvalidNameChars("romanized_last_name", "Latin family name"),
    checkMaxLength("romanized_last_name", "Latin family name", 50),
    checkIsNotNilOrEmpty("romanized_last_name", "Latin family name is required")
  ),
  R.always({})
)

export const checkPostalCode: Validator = profile => {
  if (["US", "CA"].includes(profile.country)) {
    if (isNilOrEmptyString(profile.postal_code)) {
      return { postal_code: "Postal code is required" }
    }
    if (!CP1252_REGEX.test(profile.postal_code)) {
      return { postal_code: "Postal code must be in Latin characters" }
    }
    if (
      profile.country === "US" &&
      !R.test(/^\d{5}(-\d{4})?$/, profile.postal_code)
    ) {
      return { postal_code: "Postal code must be a valid US postal code" }
    }
    if (
      profile.country === "CA" &&
      !R.test(/^[A-Za-z0-9]{6}$/, profile.postal_code)
    ) {
      return { postal_code: "Postal code must be a valid Canadian postal code" }
    }
  }
  return {}
}

export const checkPhoneNumber: Validator = checkProp(
  "phone_number",
  "Please enter a valid phone number",
  [
    R.complement(isNilOrEmptyString),
    phoneNumber => new PhoneNumber(phoneNumber).isValid()
  ]
)

const checkPersonalMessages = R.compose(
  R.map(R.apply(checkIsNotNilOrEmpty)),
  R.toPairs
)(personalMessages)

// precedence is bottom-to-top
export const personalValidation: Validator = mergeValidations(
  // first name
  checkMaxLength("first_name", "Given name", 30),
  checkInvalidNameChars("first_name", "Given name"),
  // last name
  checkMaxLength("last_name", "Family name", 50),
  checkInvalidNameChars("last_name", "Family name"),
  checkRomanizedNames,
  // date of birth
  checkDateOfBirth,
  // address
  checkLatin("address", "Street address"),
  // city
  checkLatin("city", "City"),
  // postal code
  checkPostalCode,
  // phone number
  checkPhoneNumber,
  // field is required errors first
  ...checkPersonalMessages
)

/*
 * Helper for nested validators
 * key is the top level key on profile
 * findErrors is a function which return an error object
 * profile is, well, a profile
 */
const nestedValidator = R.curry(
  (key: string, findErrors: Function, profile: Profile) => {
    if (R.isEmpty(profile[key]) || R.isNil(profile[key])) {
      return {}
    }
    let errors = findErrors(profile[key])
    if (R.equals(errors, R.repeat({}, errors.length))) {
      return {}
    }
    return { [key]: errors }
  }
)

const mergeListOfArgs = R.compose(R.mergeAll, Array)

const extraErrorCheck = R.curry(
  (key, msg, predicate, entry, errors) =>
    predicate(entry) ? R.merge(errors, { [key]: msg }) : errors
)

/*
 * Education Validation
 */
const educationMessages: ErrorMessages = {
  degree_name:               "Degree level is required",
  graduation_date:           "Please enter a valid graduation date",
  field_of_study:            "Field of study is required",
  online_degree:             "Online Degree is required",
  school_name:               "School name is required",
  school_city:               "City is required",
  school_state_or_territory: "State is required",
  school_country:            "Country is required"
}

const isHighSchool: (e: EducationEntry) => boolean = R.compose(
  R.equals(HIGH_SCHOOL),
  R.prop("degree_name")
)

const excludeFieldOfStudy: (k: string[]) => string[] = R.filter(
  R.compose(R.not, R.equals("field_of_study"))
)

const educationKeys: (e: EducationEntry) => string[] = R.ifElse(
  isHighSchool,
  R.compose(excludeFieldOfStudy, R.keys),
  R.keys
)

const schoolLocationIsValid = extraErrorCheck(
  "location",
  "City, state/territory, and country are required.",
  entry =>
    isNilOrEmptyString(entry.school_city) ||
    isNilOrEmptyString(entry.school_state_or_territory) ||
    isNilOrEmptyString(entry.school_country)
)

const additionalSchoolValidation = R.converge(mergeListOfArgs, [
  schoolLocationIsValid
])

const educationErrors: (
  xs: EducationEntry[]
) => ValidationErrors[] = R.map(entry =>
  additionalSchoolValidation(
    entry,
    findErrors(entry, educationKeys(entry), educationMessages)
  )
)

export const educationValidation = nestedValidator("education", educationErrors)

/*
 * Work History Validation
 */
const workMessages: ErrorMessages = {
  position:           "Position is required",
  industry:           "Industry is required",
  company_name:       "Name of Employer is required",
  start_date:         "Please enter a valid start date",
  city:               "City is required",
  country:            "Country is required",
  state_or_territory: "State or Territory is required"
}

// functions to perform extra checks
// must be binary functions taking (entry, errors)
// where entry is a work history entry
// and errors is the output of workHistoryErrors
// and returning errors ∪ newErrors

const endDateNotBeforeStart = extraErrorCheck(
  "end_date",
  "End date cannot be before start date",
  entry =>
    !isNilOrEmptyString(entry.end_date) &&
    moment(entry.end_date).isBefore(entry.start_date, "month")
)

const endDateNotInFuture = extraErrorCheck(
  "end_date",
  "End date cannot be in the future",
  entry => moment(entry.end_date).isAfter(moment(), "month")
)

const workLocationIsValid = extraErrorCheck(
  "location",
  "City, state/territory, and country are required.",
  entry =>
    isNilOrEmptyString(entry.city) ||
    isNilOrEmptyString(entry.state_or_territory) ||
    isNilOrEmptyString(entry.country)
)

const dateIsValid = extraErrorCheck(
  "end_date",
  "Please enter a valid end date or leave it blank",
  entry => {
    let editIsEmpty =
      _.isEmpty(entry.end_date_edit) ||
      (entry.end_date_edit !== undefined &&
        isNilOrEmptyString(entry.end_date_edit.year) &&
        isNilOrEmptyString(entry.end_date_edit.month))
    return isNilOrEmptyString(entry.end_date) && !editIsEmpty
  }
)

const additionalWorkValidation = R.converge(mergeListOfArgs, [
  endDateNotBeforeStart,
  endDateNotInFuture,
  dateIsValid,
  workLocationIsValid
])

const workHistoryErrors: (
  xs: WorkHistoryEntry[]
) => ValidationErrors[] = R.map(entry =>
  additionalWorkValidation(
    entry,
    findErrors(entry, R.keys(workMessages), workMessages)
  )
)

export const employmentValidation = nestedValidator(
  "work_history",
  workHistoryErrors
)

/*
 * Privacy Validation
 */
const privacyMessages: ErrorMessages = {
  account_privacy: "Privacy level is required"
}

export const privacyValidation = (profile: Profile): ValidationErrors =>
  findErrors(profile, R.keys(privacyMessages), privacyMessages)

/**
 * Email Validation
 * validate an email for presence of the 'subject' and 'body' fields
 */
let emailMessages: ErrorMessages = {
  subject: "Please fill in a subject",
  body:    "Please fill in a body"
}

const emailBodyValid = R.ifElse(
  R.test(/<a.*>.*<\/a>/),
  R.compose(R.not, R.test(/<a\s.*href=("|')(?!http|https|mailto:)/)),
  R.T
)

export const emailValidation = (emailInputs: EmailInputs): ValidationErrors => {
  let errors = findErrors(emailInputs, R.keys(emailMessages), emailMessages)

  if (!R.has("body", errors) && !emailBodyValid(emailInputs.body)) {
    errors["body"] =
      "All link URLs must start with 'http', 'https', or 'mailto:'"
  }
  return errors
}

/*
check that the profile is complete. we make the assumption that a
complete profile consists of:
  - a valid personal tab
  - one or more education items, for the education types the user has marked
  - one or more work items if the user has marked any work history
  - a valid privacy level
*/
export type ProfileComplete = [boolean, string | null, ValidationErrors]
export function validateProfileComplete(profile: Profile): ProfileComplete {
  let errors = {}

  // check personal tab
  errors = personalValidation(profile)
  if (!_.isEqual(errors, {})) {
    return [false, PERSONAL_STEP, errors]
  }

  // check professional tab
  if (_.isArray(profile.work_history) && !_.isEmpty(profile.work_history)) {
    errors = employmentValidation(profile)
    if (!_.isEqual(errors, {})) {
      return [false, EMPLOYMENT_STEP, errors]
    }
  }

  // check education tab
  if (_.isArray(profile.education) && !_.isEmpty(profile.education)) {
    errors = educationValidation(profile)
    if (!_.isEqual(errors, {})) {
      return [false, EDUCATION_STEP, errors]
    }
  }

  return [true, null, {}]
}

/**
 * Returns a function which merges the results of the given functions on a set of arguments
 */
export function combineValidators(...validators: Array<Function>): Function {
  return (...args) =>
    _.merge({}, ...validators.map(validator => validator(...args)))
}

const financialAidMessages: ErrorMessages = {
  income:   "Income is required",
  currency: "Please select a currency"
}

export const validateFinancialAid = (
  edit: FinancialAidState
): FinancialAidValidation => {
  let errors: FinancialAidValidation = findErrors(
    edit,
    R.keys(financialAidMessages),
    financialAidMessages
  )
  if (!edit.checkBox) {
    errors["checkBox"] = "You must agree to these terms"
  }

  if (edit.income && /\D+/.test(edit.income)) {
    errors["income"] = "Please only use whole numbers."
  }

  return errors
}

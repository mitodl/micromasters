// @flow
import R from "ramda"

import { checkProp, checkIsNotNilOrEmpty, mergeValidations } from "./profile"

export const CHANNEL_NAME_ERROR = `
Must be between 3 and 21 characters, without spaces, 
using the characters A-Z, a-z, 0-9, _, and cannot start with _.
`

// 2-21 chars, alphanumeric + _, no _ as first char
const CHANNEL_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9_]{2,20}$/
const checkName = checkProp(
  "name",
  CHANNEL_NAME_ERROR,
  R.test(CHANNEL_NAME_REGEX)
)

const requiredMessages = {
  name:  "Channel name is required",
  title: "Channel title is required"
}

const checkRequiredFields = R.compose(
  R.map(R.apply(checkIsNotNilOrEmpty)),
  R.toPairs
)(requiredMessages)

export const discussionErrors = mergeValidations(
  checkName,
  // check for required fields first
  ...checkRequiredFields
)

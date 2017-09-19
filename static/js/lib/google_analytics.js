// @flow
/* global SETTINGS:false */
import ga from "react-ga"
import R from "ramda"

const makeGAEvent = (category, action, label, value) => ({
  category: category,
  action:   action,
  label:    label,
  value:    value
})

const removeNilValue = R.when(
  R.compose(R.isNil, R.prop("value")),
  R.dissoc("value")
)

const formatGAEvent = R.compose(removeNilValue, makeGAEvent)

export const sendGAEvent = (
  category: string,
  action: string,
  label: string,
  value?: number
) => {
  ga.event(formatGAEvent(category, action, label, value))
}

const formatKeyset = R.join("-")

export const sendFormFieldEvent = (keySet: Array<string>) =>
  sendGAEvent(
    "profile-form-field",
    `completed-${formatKeyset(keySet)}`,
    SETTINGS.user.username
  )

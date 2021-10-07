// @flow
import R from "ramda"
import moment from "moment"
import type Moment from "moment"

import { DASHBOARD_MONTH_FORMAT } from "../constants"

export const ifValidDate = R.curry((defaultValue, fn, date) =>
  date.isValid() ? fn(date) : defaultValue
)

export const formatMonthDate = (date: ?string): string => {
  if (date) {
    return moment(date).format(DASHBOARD_MONTH_FORMAT)
  } else {
    return ""
  }
}

export const emptyOrNil = R.either(R.isEmpty, R.isNil)

export const parseDateString = (dateString: ?string): ?Moment =>
  emptyOrNil(dateString) ? undefined : moment(dateString)

export const formatPrettyDateTimeAmPm = (momentDate: Moment) =>
  momentDate.format("LLL")

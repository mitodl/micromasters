// @flow
import moment from "moment"
import _ from "lodash"

export const isCurrentlyEnrollable = (
  enrollmentStartDate: ?moment$Moment,
  now: ?moment$Moment
): boolean =>
  enrollmentStartDate !== null &&
  enrollmentStartDate !== undefined &&
  enrollmentStartDate.isSameOrBefore(now || moment(), "day")

export const isUpgradable = (
  upgradeDeadlineDate: ?moment$Moment,
  now: ?moment$Moment
): boolean =>
  upgradeDeadlineDate !== null &&
  upgradeDeadlineDate !== undefined &&
  upgradeDeadlineDate.isSameOrAfter(now || moment(), "day")

export const formatGrade = (grade: ?number | ?string | null): string => {
  if (_.isNil(grade) || grade === "") {
    return ""
  } else {
    grade = Number(grade)
    // isFinite will return true for numbers, false for strings and NaN
    return _.isFinite(grade) ? `${_.round(grade)}%` : ""
  }
}

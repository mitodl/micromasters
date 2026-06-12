// @flow
import moment from "moment"
import _ from "lodash"

import type { WorkHistoryEntry, EducationEntry } from "../flow/profileTypes"

export function momentCompareDesc(a: moment$Moment, b: moment$Moment): number {
  if (a.isBefore(b)) {
    return 1
  }
  if (a.isAfter(b)) {
    return -1
  }
  return 0
}

export function dateOrderDesc(
  entries: [number, Object][],
  dateFieldName: string
): any {
  const clone = _.clone(entries)
  const sortFunc = ([, a], [, b]) => {
    return momentCompareDesc(moment(a[dateFieldName]), moment(b[dateFieldName]))
  }
  return clone.sort(sortFunc)
}

export function workEntriesByDate(
  entries: Array<WorkHistoryEntry>
): Array<WorkHistoryEntry> {
  const tuples = entries.map((entry, index) => [index, entry])
  const out = []
  out.push(
    ...dateOrderDesc(
      tuples.filter(([, entry]) => entry.end_date === null),
      "start_date"
    )
  )
  out.push(
    ...dateOrderDesc(
      tuples.filter(([, entry]) => entry.end_date !== null),
      "end_date"
    )
  )
  return out
}

export function educationEntriesByDate(
  entries: Array<EducationEntry>
): Array<EducationEntry> {
  return dateOrderDesc(
    entries.map((entry, index) => [index, entry]),
    "graduation_date"
  )
}

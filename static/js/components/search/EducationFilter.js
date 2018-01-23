// @flow
import React from "react"
import { SearchkitComponent, MenuFilter, FacetAccessor } from "searchkit"
import R from "ramda"

import { EDUCATION_LEVELS } from "../../constants"
import WithReverseNestedAccessor from "../search/WithReverseNestedAccessor"
import WithAccessor from "../search/WithAccessor"

const EducationAccessor = WithReverseNestedAccessor(
  FacetAccessor,
  "profile.education.degree_name",
  "school_name_count"
)

const ModifiedMenuFilter = WithAccessor(MenuFilter, EducationAccessor)

const makeDegreeTranslations: () => Object = () => {
  const translations = {}
  for (const level of EDUCATION_LEVELS) {
    translations[level.value] = level.label
  }
  return translations
}

export default class EducationFilter extends SearchkitComponent {
  degreeTranslations: Object = makeDegreeTranslations()

  bucketsTransform = (buckets: Array<Object>) =>
    buckets.map(bucket => ({
      doc_count: R.pathOr(0, ["school_name_count", "doc_count"], bucket),
      key:       bucket.key
    }))

  render() {
    return (
      <ModifiedMenuFilter
        id="education_level"
        bucketsTransform={this.bucketsTransform}
        title=""
        field="profile.education.degree_name"
        fieldOptions={{
          type:    "nested",
          options: { path: "profile.education" }
        }}
        translations={this.degreeTranslations}
      />
    )
  }
}

// @flow
import React from "react"
import {
  AggsContainer,
  AnonymousAccessor,
  CardinalityMetric,
  FilterBucket,
  NestedBucket,
  SearchkitComponent,
  TermsBucket
} from "searchkit"
import R from "ramda"

import { EDUCATION_LEVELS } from "../../constants"
import PatchedMenuFilter from "./PatchedMenuFilter"

const makeDegreeTranslations: () => Object = () => {
  let translations = {}
  for (let level of EDUCATION_LEVELS) {
    translations[level.value] = level.label
  }
  return translations
}

export default class EducationFilter extends SearchkitComponent {
  degreeTranslations: Object = makeDegreeTranslations()

  _accessor = new AnonymousAccessor(function(query) {
    // Note: the function(...) syntax is required since this refers to AnonymousAccessor
    /**
     *  Modify query to perform aggregation on unique users,
     *  to avoid duplicate counts of multiple education objects
     *  for the same user
     **/

    let cardinality = CardinalityMetric("count", "user_id")
    let aggsContainer = AggsContainer(
      "school_name_count",
      { reverse_nested: {} },
      [cardinality]
    )
    let termsBucket = TermsBucket(
      "profile.education.degree_name",
      "profile.education.degree_name",
      {},
      aggsContainer
    )
    const nestedBucket = NestedBucket("inner", "profile.education", termsBucket)

    // uuid + 1 is the number of the accessor in the RefinementListFilter in the render method
    // I'm guessing uuid + 1 because its accessors get defined right after this accessor
    return query.setAggs(
      FilterBucket(
        `profile.education.degree_name${parseInt(this.uuid) + 1}`,
        {},
        nestedBucket
      )
    )
  })

  defineAccessor() {
    return this._accessor
  }

  bucketsTransform = (buckets: Array<Object>) =>
    buckets.map(bucket => ({
      doc_count: R.pathOr(0, ["school_name_count", "doc_count"], bucket),
      key:       bucket.key
    }))

  render() {
    return (
      <PatchedMenuFilter
        id={this.props.id || "education_level"}
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

import React from "react"
import {
  AnonymousAccessor,
  SearchkitComponent,
  RefinementListFilter,
  NestedBucket,
  TermsBucket,
  AggsContainer,
  CardinalityMetric,
  FilterBucket
} from "searchkit"

import ModifiedMultiSelect from "./ModifiedMultiSelect"

export default class WorkHistoryFilter extends SearchkitComponent {
  _accessor = new AnonymousAccessor(function(query) {
    // Note: the function(...) syntax is required since this refers to AnonymousAccessor
    /**
     *  Modify query to perform aggregation on unique users,
     *  to avoid duplicate counts of multiple work histories
     *  at one company of the same user
     **/

    let cardinality = CardinalityMetric("count", "user_id")
    let aggsContainer = AggsContainer(
      "company_name_count",
      { reverse_nested: {} },
      [cardinality]
    )
    let termsBucket = TermsBucket(
      "profile.work_history.company_name",
      "profile.work_history.company_name",
      { size: 20, order: { company_name_count: "desc" } },
      aggsContainer
    )

    let nestedBucket = NestedBucket(
      "inner",
      "profile.work_history",
      termsBucket
    )
    // uuid + 1 is the number of the accessor in the RefinementListFilter in the render method
    // I'm guessing uuid + 1 because its accessors get defined right after this accessor
    return query.setAggs(
      FilterBucket(
        `profile.work_history.company_name${parseInt(this.uuid) + 1}`,
        {},
        nestedBucket
      )
    )
  })

  defineAccessor() {
    return this._accessor
  }

  render() {
    return (
      <RefinementListFilter
        id={this.props.id || "company_name"}
        field="profile.work_history.company_name"
        title=""
        operator="OR"
        fieldOptions={{
          type:    "nested",
          options: { path: "profile.work_history" }
        }}
        listComponent={ModifiedMultiSelect}
        size={20}
      />
    )
  }
}

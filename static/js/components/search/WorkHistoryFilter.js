import React from "react"
import {
  SearchkitComponent,
  RefinementListFilter,
  FacetAccessor
} from "searchkit"

import WithAccessor from "../search/WithAccessor"
import WithReverseNestedAccessor from "../search/WithReverseNestedAccessor"
import ModifiedMultiSelect from "./ModifiedMultiSelect"

const WorkHistoryAccessor = WithReverseNestedAccessor(
  FacetAccessor,
  "profile.work_history.company_name",
  "company_name_count"
)

const ModifiedRefinementListFilter = WithAccessor(
  RefinementListFilter,
  WorkHistoryAccessor
)

export default class WorkHistoryFilter extends SearchkitComponent {
  render() {
    return (
      <ModifiedRefinementListFilter
        id="company_name"
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

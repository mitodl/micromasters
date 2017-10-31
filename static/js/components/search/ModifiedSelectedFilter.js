import React from "react"
import R from "ramda"
import _ from "lodash"

import { SEARCH_FACET_FIELD_LABEL_MAP } from "../../constants"
import { makeTranslations } from "../LearnerSearch"

export default class ModifiedSelectedFilter extends React.Component {
  props: {
    labelKey: string,
    labelValue: string,
    removeFilters: Function,
    bemBlocks?: any,
    filterId: string
  }

  translations: Object = makeTranslations()

  isLocation = (labelKey: string) =>
    R.or(_.includes(labelKey, "Country"), _.includes(labelKey, "Residence"))

  render() {
    let { labelKey, labelValue } = this.props
    let isLabelCountryName = false
    const { removeFilter, bemBlocks, filterId } = this.props
    if (R.isEmpty(labelKey)) {
      labelKey = SEARCH_FACET_FIELD_LABEL_MAP[filterId]
    } else if (labelKey in SEARCH_FACET_FIELD_LABEL_MAP) {
      labelKey = SEARCH_FACET_FIELD_LABEL_MAP[labelKey]
    } else if (labelKey in this.translations) {
      labelKey = this.translations[labelKey]
      isLabelCountryName = true
    }
    if (
      R.or(this.isLocation(labelKey), isLabelCountryName) &&
      _.hasIn(this.translations, labelValue)
    ) {
      labelValue = this.translations[labelValue]
    }
    // This comes from searchkit documentation on "Overriding Selected Filter Component"
    return (
      <div
        className={bemBlocks
          .option()
          .mix(bemBlocks.container("item"))
          .mix(`selected-filter--${filterId}`)()}
      >
        <div className={bemBlocks.option("name")}>
          {labelKey}: {labelValue}
        </div>
        <div
          className={bemBlocks.option("remove-action")}
          onClick={removeFilter}
        >
          x
        </div>
      </div>
    )
  }
}

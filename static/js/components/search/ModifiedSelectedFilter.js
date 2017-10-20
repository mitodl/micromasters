import React from "react"
import R from "ramda"
import _ from "lodash"

import { SEARCH_FACET_FIELD_LABEL_MAP } from "../../constants"
import { makeCountryNameTranslations } from "../LearnerSearch"

export default class ModifiedSelectedFilter extends React.Component {
  props: {
    labelKey: string,
    labelValue: string,
    removeFilters: Function,
    bemBlocks?: any,
    filterId: string
  }

  countryNameTranslations: Object = makeCountryNameTranslations()
  countryNameList: string = _.values(this.countryNameTranslations)

  isResidence = (labelKey: string) =>
    R.or(_.includes(labelKey, "Country"), _.includes(labelKey, "Residence"))

  isState = (labelKey: string) => _.indexOf(this.countryNameList, labelKey) > -1

  render() {
    let { labelKey, labelValue } = this.props
    const { removeFilter, bemBlocks, filterId } = this.props
    if (R.isEmpty(labelKey)) {
      labelKey = SEARCH_FACET_FIELD_LABEL_MAP[filterId]
    } else if (labelKey in SEARCH_FACET_FIELD_LABEL_MAP) {
      labelKey = SEARCH_FACET_FIELD_LABEL_MAP[labelKey]
    } else if (labelKey in this.countryNameTranslations) {
      labelKey = this.countryNameTranslations[labelKey]
    }
    if (
      R.or(this.isResidence(labelKey), this.isState(labelKey)) &&
      _.hasIn(this.countryNameTranslations, labelValue)
    ) {
      labelValue = this.countryNameTranslations[labelValue]
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

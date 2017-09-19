// @flow
import React from "react"
import R from "ramda"
import { SearchkitComponent } from "searchkit"
import Icon from "react-mdl/lib/Icon"
import { getAppliedFilterValue } from "./util"

export const FILTER_ID_ADJUST = {
  birth_location:  "profile.birth_country",
  education_level: "profile.education.degree_name",
  company_name:    "profile.work_history.company_name",
  courses:         "program.enrollments.course_title",
  payment_status:  "program.enrollments.payment_status",
  semester:        "program.enrollments.semester"
}

export default class FilterVisibilityToggle extends SearchkitComponent {
  props: {
    title: string,
    filterName: string,
    checkFilterVisibility: (filterName: string) => boolean,
    setFilterVisibility: (filterName: string, visibility: boolean) => void,
    stayVisibleIfFilterApplied: string,
    children: React$Element<*>
  }

  openClass = (): string => {
    const { filterName, checkFilterVisibility } = this.props
    return checkFilterVisibility(filterName) ? "" : "closed"
  }

  getChildFacetDocCount = (results: Object, resultIdPrefix: string): number => {
    const matchingAggKey = R.compose(
      R.find(
        // Accept keys that start with the given prefix and end with numbers
        key =>
          key.startsWith(resultIdPrefix) &&
          !isNaN(key.substring(resultIdPrefix.length))
      ),
      R.keys
    )(results.aggregations)

    if (!matchingAggKey) {
      return 0
    }

    let elementResult = results.aggregations[matchingAggKey]
    if (elementResult["inner"]) {
      return elementResult["inner"]["doc_count"]
    } else {
      return elementResult["doc_count"]
    }
  }

  isInResults = (id: string): boolean => {
    let results = this.getResults()
    if (results) {
      const resultIdPrefix = FILTER_ID_ADJUST[id] || id
      const docCount = this.getChildFacetDocCount(results, resultIdPrefix)
      if (docCount > 0) {
        return true
      }
    }
    return false
  }

  isFilterSelected = (id: string): boolean => {
    return (
      this.searchkit.state &&
      id &&
      getAppliedFilterValue(this.searchkit.state[id])
    )
  }

  stayVisibleIfEmpty = (): boolean => {
    const { stayVisibleIfFilterApplied } = this.props
    return this.isFilterSelected(stayVisibleIfFilterApplied)
  }

  renderFilterTitle = (children: React$Element<*>): React$Element<*> | null => {
    if (
      !this.isInResults(children.props.id) &&
      !this.isFilterSelected(children.props.id) &&
      !this.stayVisibleIfEmpty()
    ) {
      return null
    }
    const { title } = this.props
    return (
      <div className="title-row" onClick={this.toggleFilterVisibility}>
        <Icon
          name="arrow_drop_down"
          onClick={this.toggleFilterVisibility}
          className={this.openClass()}
        />
        <div className="sk-hierarchical-refinement-list__header">{title}</div>
      </div>
    )
  }

  toggleFilterVisibility = (): void => {
    const {
      filterName,
      checkFilterVisibility,
      setFilterVisibility
    } = this.props
    setFilterVisibility(filterName, !checkFilterVisibility(filterName))
  }

  render() {
    const { children } = this.props
    return (
      <div className={`filter-visibility-toggle ${this.openClass()}`}>
        {this.renderFilterTitle(children)}
        {children}
      </div>
    )
  }
}

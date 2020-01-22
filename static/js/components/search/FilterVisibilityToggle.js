// @flow
import React from "react"
import R from "ramda"
import { SearchkitComponent } from "searchkit"
import Icon from "@material-ui/core/Icon"
import IconButton from "@material-ui/core/IconButton"

import { getAppliedFilterValue, matchFieldName } from "./util"

export const FILTER_ID_ADJUST = {
  courses:        "program.courses.course_title",
  payment_status: "program.courses.payment_status",
  semester:       "program.course_runs.semester"
}

export default class FilterVisibilityToggle extends SearchkitComponent {
  props: {
    title: string,
    filterName: string,
    disabled?: boolean,
    checkFilterVisibility: (filterName: string) => boolean,
    setFilterVisibility: (filterName: string, visibility: boolean) => void,
    stayVisibleIfFilterApplied: string,
    children: React$Element<*>
  }

  openClass = (): string => {
    const { filterName, checkFilterVisibility } = this.props
    return checkFilterVisibility(filterName) ? "" : "closed"
  }

  disabledClass = (): string => {
    const { disabled = false } = this.props
    return disabled ? "disabled" : ""
  }

  getChildFacetDocCount = (results: Object, resultIdPrefix: string): number => {
    const matchingAggKey = R.compose(
      R.find(matchFieldName(resultIdPrefix)),
      R.keys
    )(results.aggregations)

    if (!matchingAggKey) {
      return 0
    }

    const elementResult = results.aggregations[matchingAggKey]
    if (elementResult["inner"]) {
      return elementResult["inner"]["doc_count"]
    } else {
      return elementResult["doc_count"]
    }
  }

  isInResults = (id: string): boolean => {
    const results = this.getResults()
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
        <IconButton
          onClick={this.toggleFilterVisibility}
          className={this.openClass()}
        >
          <Icon>arrow_drop_down</Icon>
        </IconButton>
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
      <div
        className={`filter-visibility-toggle ${this.openClass()} ${this.disabledClass()}`}
      >
        {this.renderFilterTitle(children)}
        {children}
      </div>
    )
  }
}

// @flow
import React from "react"
import { SearchkitComponent, FastClick } from "searchkit"

export default class CustomResetFiltersDisplay extends SearchkitComponent {
  props: {
    bemBlock: any,
    hasFilters: boolean,
    resetFilters: Function,
    clearAllLabel: string
  }

  render() {
    const { bemBlock, hasFilters, resetFilters, clearAllLabel } = this.props

    const hasFiltersOtherThanSelectedProgram =
      this.getQuery() &&
      this.getQuery().index &&
      this.getQuery().index.filters &&
      this.getQuery().index.filters.length > 1

    if (hasFilters && hasFiltersOtherThanSelectedProgram) {
      return (
        <div>
          <FastClick handler={resetFilters}>
            <div className={bemBlock().state({ disabled: !hasFilters })}>
              <div className={bemBlock("reset")}>{clearAllLabel}</div>
            </div>
          </FastClick>
        </div>
      )
    }
    return null
  }
}

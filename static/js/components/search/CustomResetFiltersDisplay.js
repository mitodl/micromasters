// @flow
import React from 'react';
import {
  ResetFiltersDisplay,
  FastClick
} from 'searchkit';

export default class CustomResetFiltersDisplay extends ResetFiltersDisplay {
  props: {
    bemBlock:      any,
    hasFilters:    boolean,
    resetFilters:  Function,
    clearAllLabel: string,
  };

  render(){
    const {
      bemBlock,
      hasFilters,
      resetFilters,
      clearAllLabel
    } = this.props;

    if (hasFilters) {
      return (
        <div>
          <FastClick handler={resetFilters}>
            <div className={bemBlock().state({disabled:!hasFilters})}>
              <div className={bemBlock("reset")}>{clearAllLabel}</div>
            </div>
          </FastClick>
        </div>
      );
    }
    return null;
  }
}

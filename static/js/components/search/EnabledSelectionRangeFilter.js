// @flow
import { RangeFilter, RangeAccessor } from "searchkit"

export class EnabledSelectionRangeAccessor extends RangeAccessor {
  isDisabled() {
    return !this.state.hasValue() && super.isDisabled()
  }
}

export default class EnabledSelectionRangeFilter extends RangeFilter {
  defineAccessor() {
    const {
      id,
      title,
      min,
      max,
      field,
      fieldOptions,
      interval,
      showHistogram
    } = this.props
    return new EnabledSelectionRangeAccessor(id, {
      id,
      min,
      max,
      title,
      field,
      interval,
      loadHistogram: showHistogram,
      fieldOptions
    })
  }
}

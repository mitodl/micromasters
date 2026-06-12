import { RefinementListFilter } from "searchkit"
import {
  NestedAggregatingFacetAccessor,
  REVERSE_NESTED_AGG_KEY
} from "./NestedAggregatingMenuFilter"

export default class CustomRefinementListFilter extends RefinementListFilter {
  /**
   * Overrides defineAccessor in RefinementListFilter
   * Sets a custom Accessor for this Filter type. This is otherwise identical to the original implementation.
   */
  defineAccessor() {
    return new NestedAggregatingFacetAccessor(
      this.props.field,
      this.getAccessorOptions()
    )
  }

  /**
   * Overrides getItems in RefinementListFilter
   * Before the aggregation results are rendered, set the doc_count of each item to be the
   * "reverse nested" doc_count. This effectively means that we will show how many unique users
   * match the query against a set of nested elements, as opposed to the total count of nested
   * elements that match (which could be greater than the number of users).
   */
  getItems() {
    const items = super.getItems()
    return items.map(item => ({
      ...item,
      doc_count: item[REVERSE_NESTED_AGG_KEY]
        ? item[REVERSE_NESTED_AGG_KEY].doc_count
        : item.doc_count
    }))
  }
}

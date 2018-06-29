import {
  FacetAccessor,
  TermQuery,
  TermsBucket,
  FilterBucket,
  AggsContainer,
  CardinalityMetric,
  MenuFilter
} from "searchkit"
import _ from "lodash"
import { NestedAccessorMixin } from "./util"

export const REVERSE_NESTED_AGG_KEY = "top_level_doc_count"
const INNER_TERMS_AGG_KEY = "nested_terms"

/**
 * Produces a Searchkit TermsBucket that includes a "reverse nested" aggregation.
 *
 * Example return value: {
 *   "nested_terms": {
 *     "terms":{
 *       "field":"program.courses.course_title", ...
 *     },
 *     "aggs":{
 *       "top_level_doc_count":{"reverse_nested":{}}
 *     }
 *   }
 * }
 */
function ReverseNestedTermsBucket(key, field, options) {
  const reverseNestedAgg = AggsContainer(REVERSE_NESTED_AGG_KEY, {
    reverse_nested: {}
  })
  return TermsBucket(key, field, options, reverseNestedAgg)
}

export class NestedAggregatingFacetAccessor extends NestedAccessorMixin(
  FacetAccessor
) {
  /**
   * Overrides buildOwnQuery in FacetAccessor
   * By default, Searchkit does this by creating an aggs bucket that applies all filters
   * that aren't applied to the current element. This implementation accounts for (a) the fact
   * that the logic for getting all other filters is changed in this custom Accessor, and
   * (b) the need for additional filters on the term query for this nested path (in order to make those filters
   * behave like an 'AND').
   */
  buildOwnQuery(query) {
    if (!this.loadAggregations) {
      return query
    } else {
      return query.setAggs(
        FilterBucket(
          this.uuid,
          this.createAggFilter(query),
          ...this.fieldContext.wrapAggregations(
            this.getTermsBucket(query),
            CardinalityMetric(`${this.key}_count`, this.key)
          )
        )
      )
    }
  }

  /**
   * Overrides getRawBuckets in FacetAccessor
   * If any filters are applied on the nested path for this element, we alter the aggs portion of
   * the query in a way that puts the buckets/doc_count data at a different path. This implementation returns the
   * buckets/doc_count data at the altered path if it doesn't exist at the default path.
   */
  getRawBuckets() {
    const baseAggsPath = [
      this.uuid,
      this.fieldContext.getAggregationPath(),
      this.key
    ]
    const aggs = this.getAggregations(baseAggsPath.concat(["buckets"]), [])
    if (aggs.length > 0) {
      return aggs
    } else {
      return this.getAggregations(
        baseAggsPath.concat([INNER_TERMS_AGG_KEY, "buckets"]),
        []
      )
    }
  }

  /**
   * Returns the key the Searchkit uses for this element in ImmutableQuery.filtersMap (which differs depending on the
   * type of filter).
   */
  getFilterMapKey = () => this.uuid

  /**
   * Creates the appropriate query element for this filter type (e.g.: {'term': 'program.courses.course_title'})
   */
  createQueryFilter(appliedFilterValue) {
    return TermQuery(this.key, appliedFilterValue)
  }

  /**
   * Gets the appropriate terms bucket for this element's agg query.
   */
  getTermsBucket(query) {
    const otherAppliedFiltersOnPath = this.createFilterForOtherElementsOnPath(
      query
    )
    const termsKey = otherAppliedFiltersOnPath ? INNER_TERMS_AGG_KEY : this.key
    const termsBucket = ReverseNestedTermsBucket(
      termsKey,
      this.key,
      _.omitBy(
        {
          size:          this.size,
          order:         this.getOrder(),
          include:       this.options.include,
          exclude:       this.options.exclude,
          min_doc_count: this.options.min_doc_count
        },
        _.isUndefined
      )
    )

    if (otherAppliedFiltersOnPath) {
      return FilterBucket(this.key, otherAppliedFiltersOnPath, termsBucket)
    } else {
      return termsBucket
    }
  }

  getDocCount() {
    // don't use the nested inner doc_count which is the sum of all document counts, instead
    // use the number of users with that document
    return this.getAggregations([this.uuid, "doc_count"], 0)
  }
}

export default class NestedAggregatingMenuFilter extends MenuFilter {
  /**
   * Overrides defineAccessor in MenuFilter
   * Sets a custom Accessor for this Filter type. This is otherwise identical to the original implementation.
   */
  defineAccessor() {
    return new NestedAggregatingFacetAccessor(
      this.props.field,
      this.getAccessorOptions()
    )
  }

  /**
   * Overrides getItems in MenuFilter
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

import {
  FacetAccessor,
  TermQuery,
  TermsBucket,
  FilterBucket,
  AggsContainer,
  CardinalityMetric
} from "searchkit"
import _ from "lodash"
import { NestedAccessorMixin } from "./util"
import PatchedMenuFilter from "./PatchedMenuFilter"

const REVERSE_NESTED_AGG_KEY = "top_level_doc_count"
const INNER_TERMS_AGG_KEY = "nested_terms"

/**
 * Produces a Searchkit TermsBucket that includes a "reverse nested" aggregation.
 *
 * Example return value: {
 *   "nested_terms": {
 *     "terms":{
 *       "field":"program.enrollments.course_title", ...
 *     },
 *     "aggs":{
 *       "top_level_doc_count":{"reverse_nested":{}}
 *     }
 *   }
 * }
 */
function ReverseNestedTermsBucket(key, field, options) {
  let reverseNestedAgg = AggsContainer(REVERSE_NESTED_AGG_KEY, {
    reverse_nested: {}
  })
  return TermsBucket(key, field, options, reverseNestedAgg)
}

class NestedAggregatingFacetAccessor extends NestedAccessorMixin(
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
    let baseAggsPath = [
      this.uuid,
      this.fieldContext.getAggregationPath(),
      this.key
    ]
    let aggs = this.getAggregations(baseAggsPath.concat(["buckets"]), [])
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
   * Creates the appropriate query element for this filter type (e.g.: {'term': 'program.enrollments.course_title'})
   */
  createQueryFilter(appliedFilterValue) {
    return TermQuery(this.key, appliedFilterValue)
  }

  /**
   * Gets the appropriate terms bucket for this element's agg query.
   */
  getTermsBucket(query) {
    let otherAppliedFiltersOnPath = this.createFilterForOtherElementsOnPath(
      query
    )
    let termsKey = otherAppliedFiltersOnPath ? INNER_TERMS_AGG_KEY : this.key
    let termsBucket = ReverseNestedTermsBucket(
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
}

export default class NestedAggregatingMenuFilter extends PatchedMenuFilter {
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
    let items = super.getItems()
    return items.map(item => ({
      ...item,
      doc_count: item[REVERSE_NESTED_AGG_KEY]
        ? item[REVERSE_NESTED_AGG_KEY].doc_count
        : item.doc_count
    }))
  }
}

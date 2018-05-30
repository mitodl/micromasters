import {
  RangeFilter,
  RangeQuery,
  HistogramBucket,
  FilterBucket,
  CardinalityMetric
} from "searchkit"
import _ from "lodash"
import { NestedAccessorMixin } from "./util"
import { EnabledSelectionRangeAccessor } from "./EnabledSelectionRangeFilter"

const REQUIRED_FILTER_ID = "courses"

class FinalGradeRangeAccessor extends NestedAccessorMixin(
  EnabledSelectionRangeAccessor
) {
  /**
   * Overrides buildOwnQuery in RangeAccessor
   * By default, Searchkit does this by creating an aggs bucket that applies all filters
   * that aren't applied to the current element. This implementation accounts for (a) the fact
   * that the logic for getting all other filters is changed in this custom Accessor, and
   * (b) the need for additional filters on the term query for this nested path (in order to make those filters
   * behave like an 'AND').
   */
  buildOwnQuery(query) {
    return query.setAggs(
      FilterBucket(
        this.key,
        this.createAggFilter(query),
        ...this.fieldContext.wrapAggregations(this.getRangeBucket(query))
      )
    )
  }

  /**
   * Overrides getBuckets in RangeAccessor
   * If any filters are applied on the nested path for this element, we alter the aggs portion of
   * the query in a way that puts the buckets/doc_count data at a different path. This implementation returns the
   * buckets/doc_count data at the altered path if it doesn't exist at the default path.
   */
  getBuckets() {
    const baseAggsPath = [
      this.key,
      this.fieldContext.getAggregationPath(),
      this.key
    ]
    const aggs = this.getAggregations(baseAggsPath.concat(["buckets"]), [])
    if (aggs.length > 0) {
      return aggs
    } else {
      return this.getAggregations(
        baseAggsPath.concat([this.key, "buckets"]),
        []
      )
    }
  }

  /**
   * Returns the key the Searchkit uses for this element in ImmutableQuery.filtersMap (which differs depending on the
   * type of filter).
   */
  getFilterMapKey = () => this.key

  /**
   * This range filter should only be applied if a filter has been applied on the course title. This
   * function will return true in that case. If a course title filter has not been applied, this
   * accessor should not do anything to the shared query, so this will return false.
   */
  shouldApplyFilter = () =>
    _.get(this.searchkit.state, REQUIRED_FILTER_ID, []).length > 0

  /**
   * Creates the appropriate query element for this filter type
   * (e.g.: {"range": {"program.courses.final_grade": {"gte": 64, "lte": 100}}})
   */
  createQueryFilter(appliedFilterValue) {
    return RangeQuery(this.options.field, {
      gte: appliedFilterValue.min,
      lte: appliedFilterValue.max
    })
  }

  /**
   * Gets the appropriate range bucket for this element's agg query.
   */
  getRangeBucket(query) {
    const otherAppliedFiltersOnPath = this.createFilterForOtherElementsOnPath(
      query
    )
    const rangeBucket = this.createInnerRangeBucket()
    if (otherAppliedFiltersOnPath) {
      return FilterBucket(this.key, otherAppliedFiltersOnPath, rangeBucket)
    } else {
      return rangeBucket
    }
  }

  /**
   * Creates the histogram bucket or cardinality metric for this element's agg query (depending on the 'loadHistogram'
   * option).
   */
  createInnerRangeBucket() {
    let metric
    if (this.options.loadHistogram) {
      metric = HistogramBucket(this.key, this.options.field, {
        interval:        this.getInterval(),
        min_doc_count:   0,
        extended_bounds: {
          min: this.options.min,
          max: this.options.max
        }
      })
    } else {
      metric = CardinalityMetric(this.key, this.options.field)
    }
    return metric
  }
}

export default class FinalGradeRangeFilter extends RangeFilter {
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
    return new FinalGradeRangeAccessor(id, {
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

  render() {
    const numFilters = _.get(this.searchkit.state, REQUIRED_FILTER_ID, [])
    return numFilters.length > 0 ? super.render() : null
  }
}

import _ from "lodash"
import R from "ramda"
import { NestedQuery, BoolMust } from "searchkit"

/**
 * Gets the filtered value from a Searchkit accessor's state. Searchkit's getValue function sometimes returns an
 * empty array when some element has no filter applied. This function returns the actual filtered value if a filter
 * is applied, or undefined if no filter is applied.
 */
export const getAppliedFilterValue = (
  appliedFilterValue
): string | Object | undefined => {
  if (appliedFilterValue !== undefined) {
    if (_.isPlainObject(appliedFilterValue)) {
      // If the filter value is an object, it can be returned as it is.
      return !_.isEmpty(appliedFilterValue) ? appliedFilterValue : undefined
    } else {
      // If the filter value is not an object, we assume that it is an array, and the single element in that array
      // is the actual value that we're filtering on.
      return appliedFilterValue.length > 0 ? appliedFilterValue[0] : undefined
    }
  }
  return undefined
}

/**
 * Mixin for accessors that will be used to treat filters on nested documents as 'AND' rather than 'OR'.
 * This is intended to produce a class that (a) inherits from a Searchkit accessor, and (b) will be
 * extended by some child class that implements some specific methods.
 *
 * Example usage:
 *   class NestedAggregatingFacetAccessor extends NestedAccessorMixin(FacetAccessor) { ... }
 *
 * @param {class} BaseSearchkitAccessorClass - A Searchkit accessor class (eg: FacetAccessor, RangeAccessor)
 */
export const NestedAccessorMixin = BaseSearchkitAccessorClass =>
  class extends BaseSearchkitAccessorClass {
    /**
     * Overrides buildSharedQuery from the Searchkit accessor class
     * If a filter has been applied for this element, we need to build the shared query as normal, then alter the
     * values for some Searchkit internals in order to produce the correct query for ES.
     */
    buildSharedQuery(query) {
      if (!this.shouldApplyFilter()) {
        return query
      }
      query = super.buildSharedQuery(query)
      let appliedFilterValue = getAppliedFilterValue(this.state.getValue())
      if (appliedFilterValue) {
        let newFilter = this.createQueryFilter(appliedFilterValue)
        query = this.amendSharedQueryForNestedDoc(query, newFilter)
      }
      return query
    }

    /** Returns the ES path for this nested document type (eg: 'program.enrollments') */
    getNestedPath = () => this.fieldContext.fieldOptions.options.path

    /** Returns the full ES path for this nested document (eg: 'program.enrollments.course_title') */
    getFieldKey = () => this.fieldContext.fieldOptions.field

    /**
     * Base implementation.
     * Returns the key the Searchkit uses for this element in ImmutableQuery.filtersMap (which differs depending on the
     * type of filter).
     */
    getFilterMapKey = () => this.key

    /**
     * Base implementation.
     * Determines whether or not the accessor will apply a filter.
     */
    shouldApplyFilter = () => true

    /**
     * Takes the shared query that Searchkit built for this element and amends it to create an 'AND' filter for
     * all filtered elements on this nested path. Searchkit essentially treats multiple filters on a nested set of
     * documents as 'OR' filters, and the changes to 'query.index.filters' and 'query.index.filtersMap'
     * are being made in order to treat those filters as 'AND'.
     */
    amendSharedQueryForNestedDoc(query, filterToAdd) {
      let groupedNestedFilter = this.createGroupedNestedFilter(
        query,
        filterToAdd
      )
      if (groupedNestedFilter) {
        let nestedPath = this.getNestedPath()

        let filters = _.cloneDeep(query.index.filters)
        // Find the element that Searchkit added to query.index.filters for this nested document and remove it
        _.remove(
          filters,
          filter => _.get(filter, ["nested", "path"]) === nestedPath
        )
        // Add the 'AND' filter that we constructed
        filters.push(groupedNestedFilter)
        query = query.update({ filters: { $set: filters } })

        let filtersMap = _.cloneDeep(query.index.filtersMap)
        // Add the same 'AND' filter to query.index.filtersMap, with the nested path (not the uuid) as the key
        filtersMap[nestedPath] = groupedNestedFilter
        // If it exists, delete the key for this specific filter (since all filters on this path are grouped together).
        delete filtersMap[this.getFilterMapKey()]
        query = query.update({ filtersMap: { $set: filtersMap } })
      }
      return query
    }

    /**
     * Creates a nested filter element that has every filter on this nested path applied in
     * an 'AND' fashion.
     *
     * Example return value: {
     *   "nested": {
     *     "path": "program.enrollments",
     *     "filter": {
     *       "bool": {
     *         "must":[{"term": ... }, {"range": ... }]
     *       }
     *     }
     *   }
     * }
     */
    createGroupedNestedFilter(query, filterToAdd) {
      let nestedPath = this.getNestedPath()
      let appliedFiltersOnPath = query.getFiltersWithKeys([nestedPath])
      if (_.isEmpty(appliedFiltersOnPath)) {
        return this.fieldContext.wrapFilter(filterToAdd)
      } else {
        let mustFilters = []
        let nestedFilter = _.get(appliedFiltersOnPath, ["nested", "filter"])
        if (nestedFilter.bool) {
          mustFilters = _.get(nestedFilter, ["bool", "must"])
        } else {
          mustFilters = [nestedFilter]
        }
        mustFilters.push(filterToAdd)
        _.set(appliedFiltersOnPath, ["nested", "filter"], BoolMust(mustFilters))
        return appliedFiltersOnPath
      }
    }

    /**
     * Creates the filter for the aggregations of this element. The filter will include (a) any filters that don't apply
     * to this element's nested path, and (b) filters on this element's nested path minus the filter for this specific
     * element.
     */
    createAggFilter(query) {
      let filters = []
      let nestedPath = this.getNestedPath()
      let unrelatedFilters = query.getFiltersWithoutKeys(nestedPath)
      if (unrelatedFilters) {
        filters.push(unrelatedFilters)
      }
      let otherAppliedFiltersOnPath = this.createFilterForOtherElementsOnPath(
        query
      )
      if (otherAppliedFiltersOnPath) {
        filters.push(NestedQuery(nestedPath, otherAppliedFiltersOnPath))
      }
      return filters.length > 0 ? BoolMust(filters) : undefined
    }

    /**
     * Gets an array of all term filters that are applied to this element's same nested path. Returns undefined if no
     * filters are applied on this element's nested path.
     *
     * Example return value: [
     *   {'term': {'program.enrollments.course_title': 'Some Course Title'},
     *   {'term': {'program.enrollments.payment_status': 'Paid'}
     * ]
     */
    getAllFiltersOnPath(query) {
      let nestedPath = this.getNestedPath()
      let appliedNestedFilters = query.getFiltersWithKeys(nestedPath)
      let filterElement = R.pathOr(
        {},
        ["nested", "filter"],
        appliedNestedFilters
      )
      if (R.path(["bool", "must"], filterElement)) {
        return R.path(["bool", "must"], filterElement)
      } else if (!_.isEmpty(filterElement)) {
        return [filterElement]
      } else {
        return []
      }
    }

    /**
     * Creates an 'AND' filter for all filters that are applied on this element's nested path, minus the filter for
     * this specific element (if it exists). If no other filters are applied on this element's nested path, undefined is
     * returned.
     *
     * Example return value: {
     *   'bool': {
     *     'must': [
     *       {'term': {'program.enrollments.course_title': 'Some Course Title'}}
     *     ]
     *   }
     * }
     */
    createFilterForOtherElementsOnPath(query) {
      let allFilters = this.getAllFiltersOnPath(query)
      let otherFilters = []
      if (allFilters.length > 0) {
        // Only keep the filters for other elements on this nested path
        otherFilters = R.filter(
          R.compose(
            R.not,
            R.equals(this.getFieldKey()),
            R.head,
            R.keys,
            R.head,
            R.values
          )
        )(allFilters)
      }
      return otherFilters.length > 0 ? BoolMust(otherFilters) : undefined
    }
  }

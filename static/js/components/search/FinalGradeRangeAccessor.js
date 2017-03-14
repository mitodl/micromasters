import {
  RangeAccessor, RangeQuery,
  BoolMust, HistogramBucket, FilterBucket,
  NestedBucket, NestedQuery, TermQuery,
  CardinalityMetric
} from "searchkit";
import _ from 'lodash';

export default class FinalGradeRangeAccessor extends RangeAccessor {
  /**
   * Overriding buildSharedQuery in RangeAccessor
   * When User changes Final Grade range, need to construct
   * a nested range filter, that will apply to all other facets
   * */
  buildSharedQuery(query) {
    if (this.state.hasValue()) {
      const val: any = this.state.getValue();
      const rangeFilter = this.fieldContext.wrapFilter(RangeQuery(this.options.field, {
        gte: val.min, lte: val.max
      }));
      const selectedFilter = {
        name: this.translate(this.options.title),
        value: `${val.min} - ${val.max}`,
        id: this.options.id,
        remove: ()=> {
          this.state = this.state.clear();
        }
      };
      const nestedQuery = NestedQuery('program.final_grades', rangeFilter);

      return query
        .addFilter(this.key, nestedQuery)
        .addSelectedFilter(selectedFilter);
    }
    return query;
  }

  /**
   * Overriding buildOwnQuery in RangeAccessor
   * Adding a nested bucket, with additional filtering
   * on the selected course in Course facet
   */
  buildOwnQuery(query) {
    let otherFilters = query.getFiltersWithoutKeys(this.key);
    let rangeFilter = RangeQuery(this.options.field, {
      gte: this.options.min, lte: this.options.max
    });
    /* Nesting range filter with path: "program.final_grades" */
    let nestedQuery = NestedQuery('program.final_grades', rangeFilter);
    /* Combining filters from all facets */
    let filters = BoolMust([otherFilters, nestedQuery]);

    const courseTitle = this.getSelectedCourse(query);
    let metric = this.buildHistogramAggregation();
    /* Match final grades for selected course title */
    let termQuery = TermQuery('program.final_grades.title', courseTitle);
    /* filter histogram aggregations by the selected course title */
    let filterBucket = FilterBucket(this.key, termQuery, ...this.fieldContext.wrapAggregations(metric));
    let nestedBucket = NestedBucket(this.key, 'program.final_grades', filterBucket);

    return query.setAggs(FilterBucket('final-grade', filters, nestedBucket));
  }

  buildHistogramAggregation() {
    let metric ;
    if (this.options.loadHistogram) {
      metric = HistogramBucket(this.key, this.options.field, {
        "interval": this.getInterval(),
        "min_doc_count": 0,
        "extended_bounds": {
          "min": this.options.min,
          "max": this.options.max
        }
      });
    } else {
      metric = CardinalityMetric(this.key, this.options.field);
    }
    return metric;
  }

  /**
   * Looks for selected course in Courses facet
   */
  getSelectedCourse(query) {
    let courseFilters = query.getJSON()['post_filter'];
    let courseTitle = "";
    if (_.has(courseFilters, 'bool')) {
      courseFilters = _.get(courseFilters, ['bool', 'must']);
      let nestedFilter = _.find(courseFilters, (filter)=>(_.has(filter, 'nested')));
      courseTitle = _.get(nestedFilter, ['nested', 'filter', 'term', 'program.enrollments.value'], "");
    }
    return courseTitle;
  }

  getBuckets() {
    return this.getAggregations([
      this.key,
      this.fieldContext.getAggregationPath(),
      this.key, this.key,
      this.key, "buckets"], []);
  }
}

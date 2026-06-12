// @flow
import {
  AggsContainer,
  TermsBucket,
  NestedBucket,
  CardinalityMetric,
  Accessor
} from "searchkit"

// This accessor needs to be provided in place of the original accessor for the filter, so that the
// uuid matches correctly.
// nestedField is assumed to be something with three parts, ie "profile.work_history.company_name"
const WithReverseNestedAccessor = (
  BaseAccessor: Accessor,
  nestedField: string,
  countName: string
) =>
  class extends BaseAccessor {
    buildSharedQuery(query: Object) {
      const modifiedQuery = super.buildSharedQuery(query)
      /**
       *  Modify query to perform aggregation on unique users,
       *  to avoid duplicate counts of multiple work histories or education items
       *  for the same user
       **/
      const pieces = nestedField.split(".")
      if (pieces.length !== 3) {
        throw new Error(`Assumed three pieces but found ${pieces.length}`)
      }

      const cardinality = CardinalityMetric("count", "user_id")
      const aggsContainer = AggsContainer(countName, { reverse_nested: {} }, [
        cardinality
      ])
      const termsBucket = TermsBucket(
        nestedField,
        nestedField,
        {},
        aggsContainer
      )

      const nestedBucket = NestedBucket(
        "inner",
        `${pieces[0]}.${pieces[1]}`,
        termsBucket
      )
      return modifiedQuery.setAggs(
        AggsContainer(
          `${this.uuid}`,
          {
            filter: {}
          },
          [nestedBucket]
        )
      )
    }

    getDocCount() {
      // ignore the fieldContext, we want the number of users with documents, not the number of documents
      return this.getAggregations([this.uuid, "doc_count"], 0)
    }
  }

export default WithReverseNestedAccessor

import React from 'react';
import {
  AnonymousAccessor,
  TermQuery,
  SearchkitComponent,
  RefinementListFilter,
  NestedBucket,
  TermsBucket,
  AggsContainer,
  CardinalityMetric,
  FilterBucket,
} from 'searchkit';

import ModifiedMultiSelect from './ModifiedMultiSelect';
import type { AvailableProgram } from '../../flow/enrollmentTypes';

export default class WorkHistoryFilter extends SearchkitComponent{
  props: {
    currentProgramEnrollment: AvailableProgram,
  };

  _accessor = new AnonymousAccessor(query => {
    const { currentProgramEnrollment } = this.props;

    let cardinality = CardinalityMetric("count", 'user_id');
    let aggs_container = AggsContainer('company_name_count',{"reverse_nested": {}}, [cardinality]);
    let terms_bucket = TermsBucket(
      'profile.work_history.company_name',
      'profile.work_history.company_name',
      {'size': 20, "order": {"company_name_count": "desc"}},
      aggs_container
    );

    let nested_bucket = NestedBucket('inner', 'profile.work_history', terms_bucket);
    return query.setAggs(FilterBucket(
      'profile.work_history.company_name11',
      TermQuery("program.id", currentProgramEnrollment.id),
      nested_bucket
    ));
  });


  defineAccessor() {
    return this._accessor;
  }

  render() {
    return (
      <RefinementListFilter
        field="profile.work_history.company_name"
        title="Company"
        id="company_name"
        operator="OR"
        fieldOptions={{type: 'nested', options: { path: 'profile.work_history'}}}
        listComponent={ModifiedMultiSelect}
        size={20}
      />
    );
  }
}

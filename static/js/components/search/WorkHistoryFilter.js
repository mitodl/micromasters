import React from 'react';
import {
  AnonymousAccessor,
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
    /**
     *  Modify query to perform aggregation on unique users,
     *  to avoid duplicate counts of multiple work histories
     *  at one company of the same user
     **/

    let cardinality = CardinalityMetric("count", 'user_id');
    let aggsContainer = AggsContainer('company_name_count',{"reverse_nested": {}}, [cardinality]);
    let termsBucket = TermsBucket(
      'profile.work_history.company_name',
      'profile.work_history.company_name',
      {'size': 20, "order": {"company_name_count": "desc"}},
      aggsContainer
    );

    let nestedBucket = NestedBucket('inner', 'profile.work_history', termsBucket);
    return query.setAggs(FilterBucket(
      'profile.work_history.company_name11',
      {},
      nestedBucket
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

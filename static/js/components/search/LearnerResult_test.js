// @flow
/* global SETTINGS: false */
import React from 'react';
import R from 'ramda';
import { assert } from 'chai';

import LearnerResult from './LearnerResult';
import { makeStrippedHtml } from '../../util/util';
import {
  USER_PROFILE_RESPONSE,
  USER_PROGRAM_RESPONSE
} from '../../constants';

describe('LearnerResult', () => {
  let renderLearnerResult = props => (
    makeStrippedHtml(<LearnerResult {...props} />)
  );

  let elasticHit = {
    result: { _source: { profile: USER_PROFILE_RESPONSE, program: USER_PROGRAM_RESPONSE } }
  };

  it("should include the user's name", () => {
    let result = renderLearnerResult(elasticHit);
    assert.include(result, USER_PROFILE_RESPONSE.preferred_name);
    assert.include(result, USER_PROFILE_RESPONSE.last_name);
  });

  it("should include the user's location", () => {
    let result = renderLearnerResult(elasticHit);
    assert.include(result, USER_PROFILE_RESPONSE.city);
    assert.include(result, USER_PROFILE_RESPONSE.country);
  });

  it("should include the user's current program grade when a grade is available", () => {
    let result = renderLearnerResult(elasticHit);
    assert.include(result, `${USER_PROGRAM_RESPONSE.grade_average}%`);
  });

  it("should show an indicator when a user has a missing/null program grade", () => {
    let emptyGradeElasticHit = R.clone(elasticHit),
      strippedEmptyGradeOutput = '-Program Avg. Grade';
    emptyGradeElasticHit.result._source.program.grade_average = null;
    let result = renderLearnerResult(emptyGradeElasticHit);
    assert.include(result, strippedEmptyGradeOutput);
    delete emptyGradeElasticHit.result._source.program.grade_average;
    result = renderLearnerResult(emptyGradeElasticHit);
    assert.include(result, strippedEmptyGradeOutput);
  });
});

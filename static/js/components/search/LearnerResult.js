// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import _ from 'lodash';
import ProfileImage from '../ProfileImage';
import UserChip from '../UserChip';
import { getPreferredName, getLocation } from '../../util/util';
import type { SearchResult } from '../../flow/searchTypes';

export default class LearnerResult extends React.Component {
  props: {
    result: { _source: SearchResult }
  };

  static hasGrade = program => (
    _.has(program, 'grade_average') && _.isNumber(program.grade_average)
  );

  render () {
    const { result: { _source: { profile, program } } } = this.props;
    return (
      <Grid className="search-grid learner-result">
        <Cell col={1}>
          <ProfileImage profile={profile} />
        </Cell>
        <Cell col={3} className="learner-name centered">
          <span>
            { getPreferredName(profile) }
          </span>
          <UserChip profile={profile} />
        </Cell>
        <Cell col={4} className="centered learner-location">
          <span>
            { getLocation(profile, false) }
          </span>
        </Cell>
        <Cell col={3} className="learner-grade">
          <span className="percent">
            { LearnerResult.hasGrade(program) ? `${program.grade_average}%` : '-' }
          </span>
          <span className="hint">Program Avg. Grade</span>
        </Cell>
        <Cell col={1} />
      </Grid>
    );
  }
}

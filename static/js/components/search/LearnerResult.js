// @flow
import React from 'react';
import { connect } from 'react-redux';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import _ from 'lodash';
import type { Dispatch } from 'redux';

import { setLearnerChipVisibility } from '../../actions/ui';
import ProfileImage from '../../containers/ProfileImage';
import LearnerChip from '../LearnerChip';
import {
  getUserDisplayName,
  getLocation,
  highlight,
} from '../../util/util';
import type { SearchResult } from '../../flow/searchTypes';
import { SearchkitComponent } from 'searchkit';

type LearnerResultProps = {
  result: { _source: SearchResult },
  setLearnerChipVisibility: (username: ?string) => void,
  learnerChipVisibility: ?string,
};

class LearnerResult extends SearchkitComponent {
  props: LearnerResultProps;

  static hasGrade = program => (
    _.has(program, 'grade_average') && _.isNumber(program.grade_average)
  );

  render () {
    const {
      result: { _source: { profile, program } },
      setLearnerChipVisibility,
      learnerChipVisibility,
    } = this.props;
    return (
      <Grid className="search-grid learner-result">
        <Cell col={1} className="learner-avatar">
          <ProfileImage profile={profile} useSmall={true} />
        </Cell>
        <Cell
          col={5}
          className="learner-name centered"
          onMouseLeave={() => setLearnerChipVisibility(null)}
          onMouseEnter={() => setLearnerChipVisibility(profile.username)}
        >
          <span className="display-name">
            { highlight(getUserDisplayName(profile), this.searchkit.state.q) }
          </span>
          {profile.username === learnerChipVisibility ? <LearnerChip profile={profile} /> : null}
        </Cell>
        <Cell col={3} className="centered learner-location">
          <span>
            { getLocation(profile, false) }
          </span>
        </Cell>
        <Cell col={3} className="learner-grade">
          <span className="percent">
            { LearnerResult.hasGrade(program) ? `${program.grade_average}%` : '-' }
          </span>
        </Cell>
      </Grid>
    );
  }
}

const mapStateToProps = state => {
  return {
    learnerChipVisibility: state.ui.learnerChipVisibility,
  };
};

const mapDispatchToProps = (dispatch: Dispatch, ownProps: LearnerResultProps) => {
  return {
    setLearnerChipVisibility: (username: ?string): void => {
      if (ownProps.learnerChipVisibility !== username) {
        dispatch(setLearnerChipVisibility(username));
      }
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(LearnerResult);

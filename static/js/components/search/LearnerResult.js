// @flow
import React from 'react';
import { connect } from 'react-redux';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import _ from 'lodash';
import type { Dispatch } from 'redux';

import { setUserChipVisibility } from '../../actions/ui';
import ProfileImage from '../../containers/ProfileImage';
import UserChip from '../UserChip';
import { getUserDisplayName, getLocation } from '../../util/util';
import type { SearchResult } from '../../flow/searchTypes';

type LearnerResultProps = {
  result: { _source: SearchResult },
  setUserChipVisibility: (username: ?string) => void,
  userChipVisibility: ?string,
};

class LearnerResult extends React.Component {
  props: LearnerResultProps;

  static hasGrade = program => (
    _.has(program, 'grade_average') && _.isNumber(program.grade_average)
  );

  render () {
    const {
      result: { _source: { profile, program } },
      setUserChipVisibility,
      userChipVisibility,
    } = this.props;
    return (
      <Grid className="search-grid learner-result">
        <Cell col={1} className="learner-avatar">
          <ProfileImage profile={profile} useSmall={true} />
        </Cell>
        <Cell
          col={3}
          className="learner-name centered"
          onMouseLeave={() => setUserChipVisibility(null)}
          onMouseEnter={() => setUserChipVisibility(profile.username)}
        >
          <span className="display-name">
            { getUserDisplayName(profile) }
          </span>
          {profile.username === userChipVisibility ? <UserChip profile={profile} /> : null}
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

const mapStateToProps = state => {
  return {
    userChipVisibility: state.ui.userChipVisibility,
  };
};

const mapDispatchToProps = (dispatch: Dispatch, ownProps: LearnerResultProps) => {
  return {
    setUserChipVisibility: (username: ?string): void => {
      if (ownProps.userChipVisibility !== username) {
        dispatch(setUserChipVisibility(username));
      }
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(LearnerResult);

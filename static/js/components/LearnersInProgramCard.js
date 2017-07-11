 /* global SETTINGS: false */
import React from 'react';
import R from 'ramda';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import type { ProgramLearners } from '../flow/dashboardTypes';


const renderLearners = R.map(learner => (
  <img
    key={learner.username}
    src={learner.image_small}
    className="learner-image"
  />
));

export default class LearnersInProgramCard extends React.Component {
  props: {
    programLearners: ProgramLearners,
  };

  render() {
    const { programLearners } = this.props;

    if (!SETTINGS.FEATURES.PROGRAM_LEARNERS) {
      return null;
    }

    return <Card className="learners-card" shadow={0} >
      <CardTitle className="learners-title">Learners in this Program</CardTitle>
      <div className="learners-wrapper">
        { renderLearners(programLearners.learners) }
      </div>
      <a href='/learners/'>
        <span>View All ({programLearners.learners_count})</span>
      </a>
    </Card>;
  }
}

import React from 'react';
import { Card, CardTitle } from 'react-mdl/lib/Card';

import type { ProgramLearners } from '../flow/dashboardTypes';

export default class LearnersInProgramCard extends React.Component {
  props: {
    programLearners: ProgramLearners,
  };

  render() {
    const { programLearners } = this.props;
    const learnersList = programLearners.learners.map(learner => (
        <img key={learner.username}
          src={learner.image_small}
          className='learner-image'
        />
    ));
    return <Card className="learners-card" shadow={0} >
      <CardTitle className="learners-title">Learners in this Program</CardTitle>
      <div className="learners-wrapper">
        {learnersList}
      </div>
      <a href='/learners/'>
        <span>View All ({programLearners.learners_count})</span>
      </a>
    </Card>;
  }
}

/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import Card from "@material-ui/core/Card"
import CardContent from "@material-ui/core/CardContent"

import type { ProgramLearners } from "../flow/dashboardTypes"

const renderLearners = R.map(learner => (
  <img
    key={learner.username}
    src={learner.image_small}
    className="learner-image"
  />
))

export default class LearnersInProgramCard extends React.Component {
  props: {
    programLearners: ProgramLearners
  }

  render() {
    const { programLearners } = this.props

    if (!SETTINGS.FEATURES.PROGRAM_LEARNERS) {
      return null
    }

    return (
      <Card className="learners-card" shadow={0}>
        <CardContent>
          <h4 className="learners-title">
            Learners in this Program
          </h4>
          <div className="learners-wrapper">
          {renderLearners(programLearners.learners)}
          </div>
          <a href="/learners/">
            <span>View All ({programLearners.learners_count})</span>
          </a>
        </CardContent>
      </Card>
    )
  }
}

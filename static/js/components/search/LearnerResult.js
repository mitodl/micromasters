// @flow
/* global SETTINGS: false */
import React from "react"
import Grid, { Cell } from "react-mdl/lib/Grid"
import _ from "lodash"

import { canAdvanceSearchProgram } from "../../lib/roles"
import ProfileImage from "../../containers/ProfileImage"
import { getLocation, highlight, getPreferredName } from "../../util/util"
import { SearchkitComponent } from "searchkit"
import type { SearchResult } from "../../flow/searchTypes"

type LearnerResultProps = {
  result: { _source: SearchResult }
}

export default class LearnerResult extends SearchkitComponent {
  props: LearnerResultProps

  static hasGrade = program =>
    _.has(program, "grade_average") && _.isNumber(program.grade_average)

  render() {
    const { result: { _source: { profile, program } } } = this.props

    const showGrade =
      program && canAdvanceSearchProgram(program, SETTINGS.roles)

    return (
      <Grid className="search-grid learner-result">
        <Cell col={1} className="learner-avatar">
          <ProfileImage profile={profile} useSmall={true} />
        </Cell>
        <Cell col={4} className="learner-name">
          <span className="display-name">
            <a href={`/learner/${profile.username}`} target="_blank">
              {highlight(getPreferredName(profile), this.searchkit.state.q)}
            </a>
          </span>
          <span className="user-name">
            {highlight(profile.username, this.searchkit.state.q)}
          </span>
        </Cell>
        <Cell col={showGrade ? 4 : 7} className="centered learner-location">
          <span>{getLocation(profile)}</span>
        </Cell>
        {showGrade ? (
          <Cell col={3} className="learner-grade">
            <span className="percent">
              {LearnerResult.hasGrade(program)
                ? `${program.grade_average}%`
                : "-"}
            </span>
          </Cell>
        ) : null}
      </Grid>
    )
  }
}

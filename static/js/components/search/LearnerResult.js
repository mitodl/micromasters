// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import Grid, { Cell } from "react-mdl/lib/Grid"
import type { Dispatch } from "redux"
import R from "ramda"
import _ from "lodash"

import { setLearnerChipVisibility } from "../../actions/ui"
import { canAdvanceSearchProgram } from "../../lib/roles"
import ProfileImage from "../../containers/ProfileImage"
import LearnerChip from "../LearnerChip"
import { getLocation, highlight, getPreferredName } from "../../util/util"
import { SearchkitComponent } from "searchkit"
import type { SearchResult } from "../../flow/searchTypes"
import type { Profile } from "../../flow/profileTypes"

type LearnerResultProps = {
  result: { _source: SearchResult },
  setLearnerChipVisibility: (username: ?string) => void,
  learnerChipVisibility: ?string,
  openLearnerEmailComposer: (profile: Profile) => void
}

class LearnerResult extends SearchkitComponent {
  props: LearnerResultProps

  static hasGrade = program =>
    _.has(program, "grade_average") && _.isNumber(program.grade_average)

  render() {
    const {
      result: { _source: { profile, program } },
      setLearnerChipVisibility,
      learnerChipVisibility,
      openLearnerEmailComposer
    } = this.props

    const showGrade =
      program && canAdvanceSearchProgram(program, SETTINGS.roles)

    let renderedLearnerChip
    if (profile.username === learnerChipVisibility) {
      renderedLearnerChip = (
        <LearnerChip
          profile={profile}
          openLearnerEmailComposer={R.partial(openLearnerEmailComposer, [
            profile
          ])}
        />
      )
    }

    return (
      <Grid className="search-grid learner-result">
        <Cell col={1} className="learner-avatar">
          <ProfileImage profile={profile} useSmall={true} />
        </Cell>
        <Cell
          col={4}
          className="learner-name"
          onMouseLeave={() => setLearnerChipVisibility(null)}
          onMouseEnter={() => setLearnerChipVisibility(profile.username)}
        >
          <span className="display-name">
            {highlight(getPreferredName(profile), this.searchkit.state.q)}
          </span>
          <span className="user-name">
            {highlight(profile.username, this.searchkit.state.q)}
          </span>
          {renderedLearnerChip}
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

const mapStateToProps = state => {
  return {
    learnerChipVisibility: state.ui.learnerChipVisibility
  }
}

const mapDispatchToProps = (
  dispatch: Dispatch,
  ownProps: LearnerResultProps
) => {
  return {
    setLearnerChipVisibility: (username: ?string): void => {
      if (ownProps.learnerChipVisibility !== username) {
        dispatch(setLearnerChipVisibility(username))
      }
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LearnerResult)

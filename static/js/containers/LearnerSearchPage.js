// @flow
/* global SETTINGS: false */
import React from "react"
import DocumentTitle from "react-document-title"
import { connect } from "react-redux"
import _ from "lodash"
import type { Dispatch } from "redux"
import R from "ramda"

import LearnerSearch from "../components/LearnerSearch"
import withSearchkitManager from "../components/search/WithSearchkitManager"
import { setSearchFilterVisibility } from "../actions/ui"
import type { UIState } from "../reducers/ui"
import {
  SEARCH_EMAIL_TYPE,
  LEARNER_EMAIL_TYPE
} from "../components/email/constants"
import {
  SEARCH_RESULT_EMAIL_CONFIG,
  LEARNER_EMAIL_CONFIG
} from "../components/email/lib"
import { withEmailDialog } from "../components/email/hoc"
import type { AllEmailsState } from "../flow/emailTypes"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import { SEARCH_FILTER_DEFAULT_VISIBILITY } from "../constants"

class LearnerSearchPage extends React.Component {
  props: {
    currentProgramEnrollment: AvailableProgram,
    dispatch: Dispatch,
    email: AllEmailsState,
    ui: UIState,
    openEmailComposer: (emailType: string, emailOpenParams: any) => void
  }

  checkFilterVisibility = (filterName: string): boolean => {
    const { ui: { searchFilterVisibility } } = this.props
    let visibility = searchFilterVisibility[filterName]
    return visibility === undefined
      ? SEARCH_FILTER_DEFAULT_VISIBILITY
      : visibility
  }

  setFilterVisibility = (filterName: string, visibility: boolean): void => {
    const { ui: { searchFilterVisibility }, dispatch } = this.props
    let clone = _.clone(searchFilterVisibility)
    clone[filterName] = visibility
    dispatch(setSearchFilterVisibility(clone))
  }

  render() {
    const { currentProgramEnrollment, openEmailComposer } = this.props

    if (_.isNil(currentProgramEnrollment)) {
      return null
    }

    return (
      <DocumentTitle title="Search | MITx MicroMasters">
        <LearnerSearch
          checkFilterVisibility={this.checkFilterVisibility}
          setFilterVisibility={this.setFilterVisibility}
          openSearchResultEmailComposer={openEmailComposer(SEARCH_EMAIL_TYPE)}
          openLearnerEmailComposer={openEmailComposer(LEARNER_EMAIL_TYPE)}
          currentProgramEnrollment={currentProgramEnrollment}
        />
      </DocumentTitle>
    )
  }
}

const mapStateToProps = (state, props) => {
  let email = state.email
  if (email[email.currentlyActive]) {
    email = _.cloneDeep(email)
    email[email.currentlyActive].searchkit = props.searchkit
  }
  return {
    ui:                       state.ui,
    email:                    email,
    currentProgramEnrollment: state.currentProgramEnrollment
  }
}

export default R.compose(
  withSearchkitManager,
  connect(mapStateToProps),
  withEmailDialog({
    [SEARCH_EMAIL_TYPE]:  SEARCH_RESULT_EMAIL_CONFIG,
    [LEARNER_EMAIL_TYPE]: LEARNER_EMAIL_CONFIG
  })
)(LearnerSearchPage)

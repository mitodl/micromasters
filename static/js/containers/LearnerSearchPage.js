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
import { withChannelCreateDialog } from "../components/channels/withChannelCreateDialog"
import type { AllEmailsState } from "../flow/emailTypes"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import { SEARCH_FILTER_DEFAULT_VISIBILITY } from "../constants"

class LearnerSearchPage extends React.Component {
  props: {
    currentProgramEnrollment: AvailableProgram,
    dispatch: Dispatch,
    email: AllEmailsState,
    ui: UIState,
    openEmailComposer: (emailType: string, emailOpenParams: any) => void,
    openChannelCreateDialog: (searchkit: Object) => void
  }

  checkFilterVisibility = (filterName: string): boolean => {
    const { ui: { searchFilterVisibility } } = this.props
    const visibility = searchFilterVisibility[filterName]
    return visibility === undefined
      ? SEARCH_FILTER_DEFAULT_VISIBILITY
      : visibility
  }

  setFilterVisibility = (filterName: string, visibility: boolean): void => {
    const { ui: { searchFilterVisibility }, dispatch } = this.props
    const clone = _.clone(searchFilterVisibility)
    clone[filterName] = visibility
    dispatch(setSearchFilterVisibility(clone))
  }

  render() {
    const {
      currentProgramEnrollment,
      openEmailComposer,
      openChannelCreateDialog
    } = this.props

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
          openChannelCreateDialog={openChannelCreateDialog}
          currentProgramEnrollment={currentProgramEnrollment}
        />
      </DocumentTitle>
    )
  }
}

const mapStateToProps = state => {
  return {
    ui:                       state.ui,
    email:                    state.email,
    currentProgramEnrollment: state.currentProgramEnrollment,
    channelDialog:            state.channelDialog,
    channels:                 state.channels
  }
}

export default R.compose(
  connect(mapStateToProps),
  // withSearchkitManager uses currentProgramEnrollment so it must come after connect(...)
  withSearchkitManager,
  withEmailDialog({
    [SEARCH_EMAIL_TYPE]:  SEARCH_RESULT_EMAIL_CONFIG,
    [LEARNER_EMAIL_TYPE]: LEARNER_EMAIL_CONFIG
  }),
  withChannelCreateDialog
)(LearnerSearchPage)

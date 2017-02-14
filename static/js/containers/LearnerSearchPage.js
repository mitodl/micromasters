// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import {
  SearchkitManager,
  SearchkitProvider,
} from 'searchkit';
import _ from 'lodash';
import type { Dispatch } from 'redux';
import R from 'ramda';

import ErrorMessage from '../components/ErrorMessage';
import LearnerSearch from '../components/LearnerSearch';
import { setSearchFilterVisibility } from '../actions/ui';
import type { UIState } from '../reducers/ui';
import { SEARCH_EMAIL_TYPE } from '../components/email/constants';
import { SEARCH_RESULT_EMAIL_CONFIG } from '../components/email/lib';
import { withEmailDialog } from '../components/email/hoc';
import type { AllEmailsState } from '../flow/emailTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import { getCookie } from '../lib/api';
import { SEARCH_FILTER_DEFAULT_VISIBILITY } from '../constants';

class LearnerSearchPage extends React.Component {
  searchkit: SearchkitManager;
  props: {
    currentProgramEnrollment: AvailableProgram,
    dispatch:                 Dispatch,
    email:                    AllEmailsState,
    ui:                       UIState,
    openEmailComposer:        () => void
  };

  constructor(props) {
    super(props);
    this.searchkit = new SearchkitManager(SETTINGS.search_url, {
      httpHeaders: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
  }

  checkFilterVisibility = (filterName: string): boolean => {
    const { ui: { searchFilterVisibility } } = this.props;
    let visibility = searchFilterVisibility[filterName];
    return visibility === undefined ? SEARCH_FILTER_DEFAULT_VISIBILITY : visibility;
  };

  setFilterVisibility = (filterName: string, visibility: boolean): void => {
    const { ui: { searchFilterVisibility }, dispatch } = this.props;
    let clone = _.clone(searchFilterVisibility);
    clone[filterName] = visibility;
    dispatch(setSearchFilterVisibility(clone));
  };

  render () {
    const { currentProgramEnrollment, openEmailComposer } = this.props;

    if (_.isNil(currentProgramEnrollment)) {
      return <ErrorMessage errorInfo={{user_message: "No program enrollment is available."}} />;
    }

    return (
      <div>
        <SearchkitProvider searchkit={this.searchkit}>
          <LearnerSearch
            checkFilterVisibility={this.checkFilterVisibility}
            setFilterVisibility={this.setFilterVisibility}
            openSearchResultEmailComposer={openEmailComposer(SEARCH_EMAIL_TYPE)}
            currentProgramEnrollment={currentProgramEnrollment}
          />
        </SearchkitProvider>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    ui:                       state.ui,
    email:                    state.email,
    currentProgramEnrollment: state.currentProgramEnrollment
  };
};

export default R.compose(
  connect(mapStateToProps),
  withEmailDialog({
    [SEARCH_EMAIL_TYPE]: SEARCH_RESULT_EMAIL_CONFIG
  })
)(LearnerSearchPage);

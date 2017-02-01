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
import { SEARCH_EMAIL_TYPE } from '../components/email/constants';
import { setSearchFilterVisibility, setEmailDialogVisibility } from '../actions/ui';
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  sendSearchResultMail
} from '../actions/email';
import { emailValidation } from '../lib/validation/profile';
import type { UIState } from '../reducers/ui';
import type { EmailState } from '../flow/emailTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import { getCookie } from '../lib/api';
import { SEARCH_FILTER_DEFAULT_VISIBILITY } from '../constants';

const searchKit = new SearchkitManager(SETTINGS.search_url, {
  httpHeaders: {
    'X-CSRFToken': getCookie('csrftoken')
  }
});

class LearnerSearchPage extends React.Component {
  props: {
    currentProgramEnrollment: AvailableProgram,
    dispatch:                 Dispatch,
    searchResultEmail:        EmailState,
    ui:                       UIState,
  };

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

  openEmailComposer = () => {
    const { dispatch } = this.props;
    dispatch(startEmailEdit(SEARCH_EMAIL_TYPE));
    dispatch(setEmailDialogVisibility(true));
  };

  closeAndClearEmailComposer = () => {
    const { dispatch } = this.props;
    dispatch(clearEmailEdit(SEARCH_EMAIL_TYPE));
    dispatch(setEmailDialogVisibility(false));
  };

  closeEmailComposerAndSend = (): void => {
    const { dispatch, searchResultEmail: { inputs } } = this.props;
    let errors = emailValidation(inputs);
    dispatch(updateEmailValidation({type: SEARCH_EMAIL_TYPE, errors: errors}));
    if (R.isEmpty(errors)) {
      dispatch(
        sendSearchResultMail(
          inputs.subject || '',
          inputs.body || '',
          searchKit.query.query
        )
      ).then(() => {
        this.closeAndClearEmailComposer();
      });
    }
  };

  updateEmailEdit = R.curry((fieldName, e) => {
    const {
      dispatch,
      searchResultEmail: { inputs, validationErrors }
    } = this.props;
    let inputsClone = R.clone(inputs);
    inputsClone[fieldName] = e.target.value;
    dispatch(updateEmailEdit({type: SEARCH_EMAIL_TYPE, inputs: inputsClone}));
    if (! R.isEmpty(validationErrors)) {
      let cloneErrors = emailValidation(inputsClone);
      dispatch(updateEmailValidation({type: SEARCH_EMAIL_TYPE, errors: cloneErrors}));
    }
  });

  render () {
    const {
      ui: { emailDialogVisibility },
      currentProgramEnrollment,
      searchResultEmail
    } = this.props;

    if (_.isNil(currentProgramEnrollment)) {
      return <ErrorMessage errorInfo={{user_message: "No program enrollment is available."}} />;
    }

    return (
      <div>
        <SearchkitProvider searchkit={searchKit}>
          <LearnerSearch
            checkFilterVisibility={this.checkFilterVisibility}
            setFilterVisibility={this.setFilterVisibility}
            openEmailComposer={this.openEmailComposer}
            closeEmailDialog={this.closeAndClearEmailComposer}
            updateEmailEdit={this.updateEmailEdit}
            sendEmail={this.closeEmailComposerAndSend}
            emailDialogVisibility={emailDialogVisibility}
            email={searchResultEmail}
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
    searchResultEmail:        state.email.searchResultEmail,
    currentProgramEnrollment: state.currentProgramEnrollment
  };
};

export default connect(mapStateToProps)(LearnerSearchPage);

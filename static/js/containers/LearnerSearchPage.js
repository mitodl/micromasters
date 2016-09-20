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
import { setSearchFilterVisibility, setEmailDialogVisibility } from '../actions/ui';
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  sendSearchResultMail
} from '../actions/email';
import { emailValidation } from '../util/validation';
import type { UIState } from '../reducers/ui';
import type { EmailState } from '../flow/emailTypes';
import type { ProgramEnrollment } from '../flow/enrollmentTypes';
import { getCookie } from '../util/api';
import { SEARCH_FILTER_DEFAULT_VISIBILITY } from '../constants';

const searchKit = new SearchkitManager(SETTINGS.search_url, {
  httpHeaders: {
    'X-CSRFToken': getCookie('csrftoken')
  }
});

class LearnerSearchPage extends React.Component {
  props: {
    currentProgramEnrollment: ProgramEnrollment,
    dispatch:                 Dispatch,
    email:                    EmailState,
    ui:                       UIState,
  };

  checkFilterVisibility: Function = (filterName: string): boolean => {
    const { ui: { searchFilterVisibility } } = this.props;
    let visibility = searchFilterVisibility[filterName];
    return visibility === undefined ? SEARCH_FILTER_DEFAULT_VISIBILITY : visibility;
  };

  setFilterVisibility: Function = (filterName: string, visibility: boolean): void => {
    const { ui: { searchFilterVisibility }, dispatch } = this.props;
    let clone = _.clone(searchFilterVisibility);
    clone[filterName] = visibility;
    dispatch(setSearchFilterVisibility(clone));
  };

  openEmailComposer: Function = (searchkit) => {
    const { dispatch } = this.props;
    const query = searchkit.query.query;
    dispatch(startEmailEdit(query));
    dispatch(setEmailDialogVisibility(true));
  };

  closeEmailComposerAndCancel: Function = () => {
    const { dispatch } = this.props;
    dispatch(clearEmailEdit());
    dispatch(setEmailDialogVisibility(false));
  };

  closeEmailComposeAndSend: Function = () => {
    const { dispatch, email: { email } } = this.props;
    let errors = emailValidation(email);
    dispatch(updateEmailValidation(errors));
    if ( R.isEmpty(errors) ) {
      dispatch(
        sendSearchResultMail(
          email.subject,
          email.body,
          email.query
        )
      );
      dispatch(clearEmailEdit());
      dispatch(setEmailDialogVisibility(false));
    }
  };

  updateEmailEdit: Function = R.curry((fieldName, e) => {
    const { email: { email, validationErrors }, dispatch } = this.props;
    let emailClone = R.clone(email);
    emailClone[fieldName] = e.target.value;
    dispatch(updateEmailEdit(emailClone));
    if ( ! R.isEmpty(validationErrors) ) {
      let cloneErrors = emailValidation(emailClone);
      dispatch(updateEmailValidation(cloneErrors));
    }
  });

  render () {
    const {
      ui: { emailDialogVisibility },
      currentProgramEnrollment,
      email
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
            emailDialogVisibility={emailDialogVisibility}
            closeEmailDialog={this.closeEmailComposerAndCancel}
            updateEmailEdit={this.updateEmailEdit}
            sendEmail={this.closeEmailComposeAndSend}
            email={email}
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
    currentProgramEnrollment: state.currentProgramEnrollment,
  };
};

export default connect(mapStateToProps)(LearnerSearchPage);

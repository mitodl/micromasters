// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import {
  BoolMust,
  FilteredQuery,
  SearchkitManager,
  SearchkitProvider,
  TermQuery,
} from 'searchkit';
import _ from 'lodash';
import type { Dispatch } from 'redux';
import R from 'ramda';

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
    return visibility === undefined ? false : visibility;
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

    let searchKit = new SearchkitManager(SETTINGS.search_url, {
      httpHeaders: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    searchKit.addDefaultQuery(query => {
      if (currentProgramEnrollment === null) {
        return query;
      }
      return query.addQuery(FilteredQuery({
        filter: BoolMust([
          TermQuery("program.id", currentProgramEnrollment.id)
        ])
      }));
    });
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

/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import Loader from 'react-loader';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import _ from 'lodash';

import {
  FETCH_SUCCESS,
  FETCH_PROCESSING,
  checkout,
} from '../actions';
import {
  TOAST_SUCCESS,
  TOAST_FAILURE,
} from '../constants';
import {
  setToastMessage,
  setConfirmSkipDialogVisibility,
} from '../actions/ui';
import { createForm } from '../util/util';
import CourseListCard from '../components/dashboard/CourseListCard';
import DashboardUserCard from '../components/dashboard/DashboardUserCard';
import FinancialAidCard from '../components/dashboard/FinancialAidCard';
import ErrorMessage from '../components/ErrorMessage';
import ProgressWidget from '../components/ProgressWidget';
import { setCalculatorDialogVisibility } from '../actions/ui';
import {
  setDocumentSentDate,
  updateDocumentSentDate,
} from '../actions/documents';
import {
  startCalculatorEdit,
  updateCalculatorEdit,
} from '../actions/financial_aid';
import type { UIState } from '../reducers/ui';
import type {
  DocumentsState,
} from '../reducers/documents';
import type { CoursePricesState, DashboardState } from '../flow/dashboardTypes';
import type { ProgramEnrollment } from '../flow/enrollmentTypes';
import type { ProfileGetResult } from '../flow/profileTypes';
import { skipFinancialAid } from '../actions/financial_aid';
import { currencyForCountry } from '../util/currency';

class DashboardPage extends React.Component {
  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  props: {
    profile:                  ProfileGetResult,
    currentProgramEnrollment: ProgramEnrollment,
    dashboard:                DashboardState,
    prices:                   CoursePricesState,
    dispatch:                 Dispatch,
    setCalculatorVisibility:  (b: boolean) => void,
    ui:                       UIState,
    documents:                DocumentsState,
  };

  componentDidMount() {
    this.handleOrderStatus();
  }

  componentDidUpdate() {
    this.handleOrderStatus();
  }

  handleOrderStatus = () => {
    const { dispatch, dashboard, location: { query } } = this.props;

    if (dashboard.fetchStatus !== FETCH_SUCCESS) {
      // wait until we have access to the dashboard
      return;
    }

    let courseKey = query.course_key;
    if (query.status === 'receipt') {
      let course = {};
      for (let program of dashboard.programs) {
        for (let courseInProgram of program.courses) {
          for (let courseRun of courseInProgram.runs) {
            if (courseRun.course_id === courseKey) {
              course = courseInProgram;
            }
          }
        }
      }

      dispatch(setToastMessage({
        title: 'Order Complete!',
        message: `You are now enrolled in ${course.title}`,
        icon: TOAST_SUCCESS,
      }));
      this.context.router.push('/dashboard/');
    } else if (query.status === 'cancel') {
      dispatch(setToastMessage({
        message: 'Order was cancelled',
        icon: TOAST_FAILURE,
      }));
      this.context.router.push('/dashboard/');
    }
  };

  dispatchCheckout = (courseId: string) => {
    const { dispatch } = this.props;

    return dispatch(checkout(courseId)).then(result => {
      const { payload, url, method } = result;

      if (method === 'POST') {
        const form = createForm(url, payload);
        const body = document.querySelector("body");
        body.appendChild(form);
        form.submit();
      } else {
        window.location = url;
      }
    });
  };

  openFinancialAidCalculator = () => {
    const {
      dispatch,
      currentProgramEnrollment,
      profile: { profile: { country } }
    } = this.props;
    dispatch(startCalculatorEdit(currentProgramEnrollment.id));
    if ( country ) {
      let currencyPrediction = currencyForCountry(country);
      dispatch(updateCalculatorEdit({ currency: currencyPrediction }));
    }
    dispatch(setCalculatorDialogVisibility(true));
  };

  setDocumentSentDate = (newDate: string): void => {
    const { dispatch } = this.props;
    dispatch(setDocumentSentDate(newDate));
  };

  skipFinancialAid = programId => {
    const { dispatch } = this.props;
    dispatch(skipFinancialAid(programId)).then(() => {
      this.setConfirmSkipDialogVisibility(false);
    });
  };

  setConfirmSkipDialogVisibility = bool => {
    const { dispatch } = this.props;
    dispatch(setConfirmSkipDialogVisibility(bool));
  };

  updateDocumentSentDate = (financialAidId: number, sentDate: string): Promise<*> => {
    const { dispatch } = this.props;
    return dispatch(updateDocumentSentDate(financialAidId, sentDate));
  };

  render() {
    const {
      dashboard,
      prices,
      profile: { profile },
      documents,
      currentProgramEnrollment,
      ui,
    } = this.props;
    const loaded = dashboard.fetchStatus !== FETCH_PROCESSING && prices.fetchStatus !== FETCH_PROCESSING;
    let errorMessage;
    let dashboardContent;
    // if there are no errors coming from the backend, simply show the dashboard
    let program, coursePrice;
    if (!_.isNil(currentProgramEnrollment)) {
      program = dashboard.programs.find(program => program.id === currentProgramEnrollment.id);
      coursePrice = prices.coursePrices.find(coursePrice => coursePrice.program_id === currentProgramEnrollment.id);
    }
    if (dashboard.errorInfo !== undefined) {
      errorMessage = <ErrorMessage errorInfo={dashboard.errorInfo}/>;
    } else if (prices.errorInfo !== undefined) {
      errorMessage = <ErrorMessage errorInfo={prices.errorInfo} />;
    } else if (_.isNil(program) || _.isNil(coursePrice)) {
      errorMessage = <ErrorMessage errorInfo={{user_message: "No program enrollment is available."}} />;
    } else {
      let financialAidCard;
      if (program.financial_aid_availability) {
        financialAidCard = <FinancialAidCard
          program={program}
          coursePrice={coursePrice}
          openFinancialAidCalculator={this.openFinancialAidCalculator}
          documents={documents}
          setDocumentSentDate={this.setDocumentSentDate}
          skipFinancialAid={this.skipFinancialAid}
          updateDocumentSentDate={this.updateDocumentSentDate}
          setConfirmSkipDialogVisibility={this.setConfirmSkipDialogVisibility}
          ui={ui}
        />;
      }

      dashboardContent = (
        <div className="double-column">
          <div className="first-column">
            <DashboardUserCard profile={profile} program={program}/>
            {financialAidCard}
            <CourseListCard
              program={program}
              coursePrice={coursePrice}
              key={program.id}
              checkout={this.dispatchCheckout}
              openFinancialAidCalculator={this.openFinancialAidCalculator}
            />
          </div>
          <div className="second-column">
            <ProgressWidget program={program} />
            <Card shadow={0}>
              <CardTitle>Learners Near Me</CardTitle>
            </Card>
          </div>
        </div>
      );
    }
    return (
      <div className="dashboard">
        <Loader loaded={loaded}>
          {errorMessage}
          {dashboardContent}
        </Loader>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  let profile = {
    profile: {}
  };
  if (state.profiles[SETTINGS.username] !== undefined) {
    profile = state.profiles[SETTINGS.username];
  }

  return {
    profile: profile,
    dashboard: state.dashboard,
    prices: state.prices,
    currentProgramEnrollment: state.currentProgramEnrollment,
    ui: state.ui,
    documents: state.documents,
  };
};

export default connect(mapStateToProps)(DashboardPage);

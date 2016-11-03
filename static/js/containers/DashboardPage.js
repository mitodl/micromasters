/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import Loader from '../components/Loader';
import _ from 'lodash';
import moment from 'moment';

import {
  FETCH_SUCCESS,
  FETCH_PROCESSING,
  checkout,
  updateCourseStatus,
  fetchDashboard,
} from '../actions';
import {
  TOAST_SUCCESS,
  TOAST_FAILURE,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_PENDING_ENROLLMENT,
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CURRENTLY_ENROLLED,
} from '../constants';
import { addCourseEnrollment } from '../actions/course_enrollments';
import {
  setToastMessage,
  setConfirmSkipDialogVisibility,
  setDocsInstructionsVisibility,
} from '../actions/ui';
import { createForm, findCourseRun } from '../util/util';
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
import { setTimeoutActive } from '../actions/order_receipt';
import type { UIState } from '../reducers/ui';
import type { OrderReceiptState } from '../reducers/order_receipt';
import type {
  DocumentsState,
} from '../reducers/documents';
import type { CoursePricesState, DashboardState } from '../flow/dashboardTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import type { ProfileGetResult } from '../flow/profileTypes';
import type { Course, CourseRun } from '../flow/programTypes';
import { skipFinancialAid } from '../actions/financial_aid';
import { currencyForCountry } from '../lib/currency';
import DocsInstructionsDialog from '../components/DocsInstructionsDialog';

class DashboardPage extends React.Component {
  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  props: {
    profile:                  ProfileGetResult,
    currentProgramEnrollment: AvailableProgram,
    dashboard:                DashboardState,
    prices:                   CoursePricesState,
    dispatch:                 Dispatch,
    setCalculatorVisibility:  (b: boolean) => void,
    ui:                       UIState,
    documents:                DocumentsState,
    fetchDashboard:           () => void,
    orderReceipt:             OrderReceiptState,
  };

  componentDidMount() {
    this.handleOrderStatus();
  }

  componentDidUpdate() {
    this.handleOrderStatus();
  }

  handleOrderSuccess = (course: Course): void => {
    const { dispatch } = this.props;
    dispatch(setToastMessage({
      title: 'Order Complete!',
      message: `You are now enrolled in ${course.title}`,
      icon: TOAST_SUCCESS,
    }));
    this.context.router.push('/dashboard/');
  };

  handleOrderCancellation = (): void => {
    const { dispatch } = this.props;
    dispatch(setToastMessage({
      message: 'Order was cancelled',
      icon: TOAST_FAILURE,
    }));
    this.context.router.push('/dashboard/');
  };

  handleOrderPending = (run: CourseRun): void => {
    const { dispatch } = this.props;
    dispatch(updateCourseStatus(run.course_id, STATUS_PENDING_ENROLLMENT));

    if (!this.props.orderReceipt.timeoutActive) {
      setTimeout(() => {
        const { orderReceipt } = this.props;
        dispatch(setTimeoutActive(false));
        let deadline = moment(orderReceipt.initialTime).add(30, 'seconds');
        let now = moment();
        if (now.isBefore(deadline)) {
          dispatch(fetchDashboard(true));
        } else {
          dispatch(setToastMessage({
            message: 'Order was not processed',
            icon: TOAST_FAILURE,
          }));
        }
      }, 3000);
      dispatch(setTimeoutActive(true));
    }
  };

  handleOrderStatus = () => {
    const { dashboard, location: { query } } = this.props;

    if (dashboard.fetchStatus !== FETCH_SUCCESS) {
      // wait until we have access to the dashboard
      return;
    }

    let courseKey = query.course_key;
    if (query.status === 'receipt') {
      const [courseRun, course] = findCourseRun(dashboard.programs, run => run.course_id === courseKey);
      switch (courseRun.status) {
      case STATUS_CAN_UPGRADE:
      case STATUS_OFFERED:
        // user is directed to the order receipt page but order is not yet fulfilled
        this.handleOrderPending(courseRun);
        break;
      case STATUS_NOT_PASSED:
      case STATUS_PASSED:
      case STATUS_CURRENTLY_ENROLLED:
        this.handleOrderSuccess(course);
        break;
      default:
        // do nothing, a timeout was set to check back later
        break;
      }
    } else if (query.status === 'cancel') {
      this.handleOrderCancellation();
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

  addCourseEnrollment = (courseId: string): void => {
    const { dispatch } = this.props;
    return dispatch(addCourseEnrollment(courseId));
  };

  setDocsInstructionsVisibility = bool => {
    const { dispatch } = this.props;
    dispatch(setDocsInstructionsVisibility(bool));
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
          setDocsInstructionsVisibility={this.setDocsInstructionsVisibility}
          ui={ui}
        />;
      }

      dashboardContent = (
        <div className="double-column">
          <DocsInstructionsDialog
            open={ui.docsInstructionsVisibility}
            setDialogVisibility={this.setDocsInstructionsVisibility}
          />
          <div className="first-column">
            <DashboardUserCard profile={profile} program={program}/>
            {financialAidCard}
            <CourseListCard
              program={program}
              coursePrice={coursePrice}
              key={program.id}
              checkout={this.dispatchCheckout}
              openFinancialAidCalculator={this.openFinancialAidCalculator}
              addCourseEnrollment={this.addCourseEnrollment}
            />
          </div>
          <div className="second-column">
            <ProgressWidget program={program} />
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
  if (SETTINGS.user && state.profiles[SETTINGS.user.username] !== undefined) {
    profile = state.profiles[SETTINGS.user.username];
  }

  return {
    profile: profile,
    dashboard: state.dashboard,
    prices: state.prices,
    currentProgramEnrollment: state.currentProgramEnrollment,
    ui: state.ui,
    documents: state.documents,
    orderReceipt: state.orderReceipt,
  };
};

export default connect(mapStateToProps)(DashboardPage);

// @flow
/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import Loader from '../components/Loader';
import _ from 'lodash';
import moment from 'moment';

import { calculatePrices } from '../lib/coupon';
import {
  FETCH_SUCCESS,
  FETCH_PROCESSING,
  checkout,
  updateCourseStatus,
  fetchDashboard,
  clearDashboard,
  fetchCoursePrices,
  clearCoursePrices,
} from '../actions';
import {
  COUPON_CONTENT_TYPE_COURSE,
  TOAST_SUCCESS,
  TOAST_FAILURE,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_PENDING_ENROLLMENT,
  STATUS_NOT_PASSED,
  STATUS_PASSED,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_PAID_BUT_NOT_ENROLLED,
} from '../constants';
import { addCourseEnrollment } from '../actions/course_enrollments';
import {
  setToastMessage,
  setConfirmSkipDialogVisibility,
  setDocsInstructionsVisibility,
  setCouponNotificationVisibility,
} from '../actions/ui';
import { createForm, findCourseRun } from '../util/util';
import CourseListCard from '../components/dashboard/CourseListCard';
import DashboardUserCard from '../components/dashboard/DashboardUserCard';
import FinancialAidCard from '../components/dashboard/FinancialAidCard';
import ErrorMessage from '../components/ErrorMessage';
import ProgressWidget from '../components/ProgressWidget';
import { setCalculatorDialogVisibility } from '../actions/ui';
import {
  clearCoupons,
  fetchCoupons,
} from '../actions/coupons';
import {
  setDocumentSentDate,
  updateDocumentSentDate,
} from '../actions/documents';
import {
  startCalculatorEdit,
  updateCalculatorEdit,
} from '../actions/financial_aid';
import { setTimeoutActive } from '../actions/order_receipt';
import { attachCoupon, setRecentlyAttachedCoupon } from '../actions/coupons';
import type { UIState } from '../reducers/ui';
import type { OrderReceiptState } from '../reducers/order_receipt';
import type {
  DocumentsState,
} from '../reducers/documents';
import type { CoursePricesState, DashboardState } from '../flow/dashboardTypes';
import type {
  AvailableProgram, AvailableProgramsState, CourseEnrollmentsState
} from '../flow/enrollmentTypes';
import type { FinancialAidState } from '../reducers/financial_aid';
import type { CouponsState } from '../reducers/coupons';
import type { ProfileGetResult } from '../flow/profileTypes';
import type { Course, CourseRun } from '../flow/programTypes';
import type { CheckoutState } from '../reducers';
import { skipFinancialAid } from '../actions/financial_aid';
import { currencyForCountry } from '../lib/currency';
import DocsInstructionsDialog from '../components/DocsInstructionsDialog';
import CouponNotificationDialog from '../components/CouponNotificationDialog';

class DashboardPage extends React.Component {
  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  props: {
    coupons:                  CouponsState,
    profile:                  ProfileGetResult,
    currentProgramEnrollment: AvailableProgram,
    programs:                 AvailableProgramsState,
    dashboard:                DashboardState,
    prices:                   CoursePricesState,
    dispatch:                 Dispatch,
    setCalculatorVisibility:  (b: boolean) => void,
    ui:                       UIState,
    documents:                DocumentsState,
    fetchDashboard:           () => void,
    orderReceipt:             OrderReceiptState,
    courseEnrollments:        CourseEnrollmentsState,
    checkout:                 CheckoutState,
    financialAid:             FinancialAidState,
    location:                 Object,
  };

  componentDidMount() {
    this.updateRequirements();
  }

  componentDidUpdate() {
    this.updateRequirements();
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch(clearDashboard());
    dispatch(clearCoursePrices());
    dispatch(clearCoupons());
  }

  handleOrderSuccess = (course: Course): void => {
    const { dispatch, ui: { toastMessage } } = this.props;
    let firstRun: ?CourseRun = course.runs.length > 0 ? course.runs[0] : null;

    if (_.isNil(toastMessage)) {
      if (firstRun && firstRun.status === STATUS_PAID_BUT_NOT_ENROLLED) {
        dispatch(setToastMessage({
          title: 'Course Enrollment',
          message: `Something went wrong. You paid for this course '${course.title}' but are not enrolled.`,
          icon: TOAST_FAILURE,
        }));
      } else {
        dispatch(setToastMessage({
          title: 'Order Complete!',
          message: `You are now enrolled in ${course.title}`,
          icon: TOAST_SUCCESS,
        }));
      }
    }
    this.context.router.push('/dashboard/');
  };

  handleOrderCancellation = (): void => {
    const { dispatch, ui: { toastMessage } } = this.props;
    if (_.isNil(toastMessage)) {
      dispatch(setToastMessage({
        message: 'Order was cancelled',
        icon: TOAST_FAILURE,
      }));
    }
    this.context.router.push('/dashboard/');
  };

  handleOrderPending = (run: CourseRun): void => {
    const { dispatch } = this.props;
    dispatch(updateCourseStatus(run.course_id, STATUS_PENDING_ENROLLMENT));

    if (!this.props.orderReceipt.timeoutActive) {
      setTimeout(() => {
        const { orderReceipt } = this.props;
        dispatch(setTimeoutActive(false));
        let deadline = moment(orderReceipt.initialTime).add(2, 'minutes');
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

  updateRequirements = () => {
    this.fetchDashboard();
    this.fetchCoursePrices();
    this.handleCoupon();
    this.fetchCoupons();
    this.handleOrderStatus();
  };

  fetchDashboard() {
    const { dashboard, dispatch } = this.props;
    if (dashboard.fetchStatus === undefined) {
      dispatch(fetchDashboard());
    }
  }

  fetchCoursePrices() {
    const { prices, dispatch } = this.props;
    if (prices.fetchStatus === undefined) {
      dispatch(fetchCoursePrices());
    }
  }

  fetchCoupons() {
    const { coupons, dispatch } = this.props;
    if (coupons.fetchGetStatus === undefined) {
      dispatch(fetchCoupons());
    }
  }

  handleOrderStatus = () => {
    const { dashboard, location: { query } } = this.props;

    if (dashboard.fetchStatus !== FETCH_SUCCESS) {
      // wait until we have access to the dashboard
      return;
    }

    let courseKey = query.course_key;
    if (query.status === 'receipt') {
      const [courseRun, course] = findCourseRun(dashboard.programs, run => run !== null && run.course_id === courseKey);
      if (courseRun === null || course === null) {
        // could not find course to handle order status for
        return;
      }
      switch (courseRun.status) {
      case STATUS_CAN_UPGRADE:
      case STATUS_OFFERED:
        // user is directed to the order receipt page but order is not yet fulfilled
        this.handleOrderPending(courseRun);
        break;
      case STATUS_NOT_PASSED:
      case STATUS_PASSED:
      case STATUS_CURRENTLY_ENROLLED:
      case STATUS_PAID_BUT_NOT_ENROLLED:
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

  handleCoupon = () => {
    const { coupons, dispatch, location: { query } } = this.props;

    if ( !query.coupon ) {
      // If there's no coupon code in the URL query parameters,
      // there's nothing to do.
      return;
    }

    if ( coupons.fetchPostStatus !== undefined ) {
      // If we've already launched a POST request to attach this coupon
      // to this user, don't launch another one.
      return;
    }

    if ( coupons.fetchGetStatus === FETCH_PROCESSING || coupons.fetchGetStatus === undefined ) {
      /*
      Abort to avoid the following race condition:

        1. launch first fetchCoupons() API request
        2. launch attachCoupon() API request
        3. attachCoupon() returns, launch second fetchCoupons() API request
        4. second fetchCoupons() returns, updates Redux store with accurate information
        5. first fetchCoupons() finally returns, updates Redux store with stale information

      Ideally, it would be nice to abort the first fetchCoupons() API request
      in this case, but fetches can't be aborted. Instead, we will abort
      this function (by returning early), and rely on being called again in the
      future.
      */
      return;
    }

    dispatch(attachCoupon(query.coupon)).then(result => {
      this.setRecentlyAttachedCoupon(result.coupon);
      this.setCouponNotificationVisibility(true);
      this.context.router.push('/dashboard/');
      // update coupon state in Redux
      dispatch(fetchCoupons());
    }).catch(() => {
      dispatch(setToastMessage({
        title: "Coupon failed",
        message: "This coupon code is invalid or does not exist.",
        icon: TOAST_FAILURE
      }));
      this.context.router.push('/dashboard/');
    });
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

  setCouponNotificationVisibility = bool => {
    const { dispatch } = this.props;
    dispatch(setCouponNotificationVisibility(bool));
  };

  setRecentlyAttachedCoupon = coupon => {
    const { dispatch } = this.props;
    dispatch(setRecentlyAttachedCoupon(coupon));
  };

  renderCouponDialog() {
    const {
      programs,
      ui,
      coupons,
      dashboard,
    } = this.props;
    const coupon = coupons.recentlyAttachedCoupon;
    if ( !coupon ) {
      return null;
    }
    const couponProgram = programs.availablePrograms.find(
      program => program.id === coupon.program_id
    );
    let couponCourse = null;
    if ( coupon.content_type === COUPON_CONTENT_TYPE_COURSE ) {
      const dashboardCouponProgram = dashboard.programs.find(
        program => program.id === coupon.program_id
      );
      couponCourse = dashboardCouponProgram.courses.find(
        course => course.id === coupon.object_id
      );
    }
    return <CouponNotificationDialog
      coupon={coupon}
      couponProgram={couponProgram}
      couponCourse={couponCourse}
      open={ui.couponNotificationVisibility}
      setDialogVisibility={this.setCouponNotificationVisibility}
    />;
  }

  render() {
    const {
      dashboard,
      prices,
      profile: { profile },
      documents,
      currentProgramEnrollment,
      ui,
      courseEnrollments,
      checkout,
      financialAid,
      coupons,
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
      errorMessage = <ErrorMessage errorInfo={prices.errorInfo}/>;
    } else if (
      program === null || program === undefined ||
      coursePrice === null || coursePrice === undefined
    ) {
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
          financialAid={financialAid}
        />;
      }

      const calculatedPrices = calculatePrices(dashboard.programs, prices.coursePrices, coupons.coupons);

      dashboardContent = (
        <div className="double-column">
          <DocsInstructionsDialog
            open={ui.docsInstructionsVisibility}
            setDialogVisibility={this.setDocsInstructionsVisibility}
          />
          {this.renderCouponDialog()}
          <div className="first-column">
            <DashboardUserCard profile={profile} program={program}/>
            {financialAidCard}
            <CourseListCard
              program={program}
              courseEnrollAddStatus={courseEnrollments.courseEnrollAddStatus}
              prices={calculatedPrices}
              key={program.id}
              checkout={this.dispatchCheckout}
              checkoutStatus={checkout.fetchStatus}
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
    programs: state.programs,
    currentProgramEnrollment: state.currentProgramEnrollment,
    ui: state.ui,
    documents: state.documents,
    orderReceipt: state.orderReceipt,
    courseEnrollments: state.courseEnrollments,
    checkout: state.checkout,
    financialAid: state.financialAid,
    coupons: state.coupons,
  };
};

export default connect(mapStateToProps)(DashboardPage);

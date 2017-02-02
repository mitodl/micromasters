// @flow
/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import _ from 'lodash';
import moment from 'moment';
import R from 'ramda';

import Loader from '../components/Loader';
import CouponCard from '../components/dashboard/CouponCard';
import { calculatePrices } from '../lib/coupon';
import {
  FETCH_SUCCESS,
  FETCH_PROCESSING,
  updateCourseStatus,
  fetchDashboard,
  clearDashboard,
  fetchCoursePrices,
  clearCoursePrices,
} from '../actions';
import {
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
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
import { findCourseRun } from '../util/util';
import CourseListCard from '../components/dashboard/CourseListCard';
import DashboardUserCard from '../components/dashboard/DashboardUserCard';
import FinancialAidCard from '../components/dashboard/FinancialAidCard';
import FinalExamCard from '../components/dashboard/FinalExamCard';
import ErrorMessage from '../components/ErrorMessage';
import ProgressWidget from '../components/ProgressWidget';
import { COURSE_EMAIL_TYPE } from '../components/email/constants';
import { setCalculatorDialogVisibility, setEmailDialogVisibility } from '../actions/ui';
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
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  sendCourseTeamMail
} from '../actions/email';
import { emailValidation } from '../lib/validation/profile';
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
import type { EmailState } from '../flow/emailTypes';
import type { ProfileGetResult } from '../flow/profileTypes';
import type { Course, CourseRun } from '../flow/programTypes';
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
    courseTeamEmail:          EmailState,
    documents:                DocumentsState,
    fetchDashboard:           () => void,
    orderReceipt:             OrderReceiptState,
    courseEnrollments:        CourseEnrollmentsState,
    financialAid:             FinancialAidState,
    location:                 Object,
  };

  componentDidMount() {
    this.updateRequirements();
  }

  componentDidUpdate() {
    this.updateRequirements();

    let program = this.getCurrentlyEnrolledProgram();
    if (this.shouldSkipFinancialAid() && program !== undefined) {
      this.skipFinancialAid(program.id);
    }
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch(clearDashboard());
    dispatch(clearCoursePrices());
    dispatch(clearCoupons());
  }
  
  openEmailComposer = (course: Course) => {
    const { dispatch } = this.props;
    dispatch(
      startEmailEdit({
        type: COURSE_EMAIL_TYPE,
        params: {courseId: course.id},
        subheading: `${course.title} Course Team`
      })
    );
    dispatch(setEmailDialogVisibility(true));
  };

  closeAndClearEmailComposer = () => {
    const { dispatch } = this.props;
    dispatch(clearEmailEdit(COURSE_EMAIL_TYPE));
    dispatch(setEmailDialogVisibility(false));
  };

  updateEmailEdit = R.curry((fieldName, e) => {
    const {
      dispatch,
      courseTeamEmail: { inputs, validationErrors }
    } = this.props;
    let inputsClone = R.clone(inputs);
    inputsClone[fieldName] = e.target.value;
    dispatch(updateEmailEdit({type: COURSE_EMAIL_TYPE, inputs: inputsClone}));
    if (!R.isEmpty(validationErrors)) {
      let cloneErrors = emailValidation(inputsClone);
      dispatch(updateEmailValidation({type: COURSE_EMAIL_TYPE, errors: cloneErrors}));
    }
  });

  closeEmailComposerAndSend = (): void => {
    const { dispatch, courseTeamEmail: { inputs, params } } = this.props;
    let errors = emailValidation(inputs);
    dispatch(updateEmailValidation({type: COURSE_EMAIL_TYPE, errors: errors}));
    if (R.isEmpty(errors)) {
      dispatch(
        sendCourseTeamMail(
          inputs.subject || '',
          inputs.body || '',
          params.courseId
        )
      ).then(() => {
        this.closeAndClearEmailComposer();
      });
    }
  };

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

    if (!query.coupon) {
      // If there's no coupon code in the URL query parameters,
      // there's nothing to do.
      return;
    }

    if (coupons.fetchPostStatus !== undefined) {
      // If we've already launched a POST request to attach this coupon
      // to this user, don't launch another one.
      return;
    }

    if (coupons.fetchGetStatus === FETCH_PROCESSING || coupons.fetchGetStatus === undefined) {
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

  openFinancialAidCalculator = () => {
    const {
      dispatch,
      currentProgramEnrollment,
      profile: { profile: { country } }
    } = this.props;
    dispatch(startCalculatorEdit(currentProgramEnrollment.id));
    if (country) {
      let currencyPrediction = currencyForCountry(country);
      dispatch(updateCalculatorEdit({ currency: currencyPrediction }));
    }
    dispatch(setCalculatorDialogVisibility(true));
  };

  setDocumentSentDate = (newDate: string): void => {
    const { dispatch } = this.props;
    dispatch(setDocumentSentDate(newDate));
  };

  getCurrentlyEnrolledProgram = () => {
    const { currentProgramEnrollment, dashboard } = this.props;
    if (
      currentProgramEnrollment !== null &&
      dashboard !== null
    ) {
      return dashboard.programs.find(program => (
        program.id === currentProgramEnrollment.id
      ));
    } else {
      return undefined;
    }
  }

  skipFinancialAid = programId => {
    const { dispatch, financialAid } = this.props;

    let program = this.getCurrentlyEnrolledProgram();
    if (
      program &&
      program.financial_aid_user_info &&
      program.financial_aid_user_info.has_user_applied === false &&
      financialAid.fetchSkipStatus === undefined
    ) {
      dispatch(skipFinancialAid(programId)).then(() => {
        this.setConfirmSkipDialogVisibility(false);
      }).catch(() => {
        this.setConfirmSkipDialogVisibility(false);
        dispatch(setToastMessage({
          message: "Failed to skip financial aid.",
          icon: TOAST_FAILURE,
        }));
      });
    }
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
    if (!coupon) {
      return null;
    }
    const couponProgram = programs.availablePrograms.find(
      program => program.id === coupon.program_id
    );
    let couponCourse = null;
    if (coupon.content_type === COUPON_CONTENT_TYPE_COURSE) {
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

  navigateToProfile = () => {
    this.context.router.push("/learner");
  };

  shouldSkipFinancialAid = (): boolean => {
    let program = this.getCurrentlyEnrolledProgram();

    return R.compose(
      R.any(coupon => (
        program !== undefined &&
        coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM &&
        coupon.amount_type === COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT &&
        coupon.program_id === program.id &&
        coupon.amount.eq(1)
      )),
      R.pathOr([], ['coupons', 'coupons'])
    )(this.props);
  }

  render() {
    const {
      dashboard,
      prices,
      profile: { profile },
      documents,
      currentProgramEnrollment,
      ui,
      courseTeamEmail,
      courseEnrollments,
      financialAid,
      coupons,
    } = this.props;
    const loaded = dashboard.fetchStatus !== FETCH_PROCESSING && prices.fetchStatus !== FETCH_PROCESSING;
    let errorMessage;
    let dashboardContent;
    // if there are no errors coming from the backend, simply show the dashboard
    let program, coursePrice;
    if (!_.isNil(currentProgramEnrollment)) {
      program = this.getCurrentlyEnrolledProgram();
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
        if (!this.shouldSkipFinancialAid()) {
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
      }

      let couponCard;
      let programId = program.id;
      let coupon = coupons.coupons.find(coupon => coupon.program_id === programId);
      if (coupon && coupon.content_type === COUPON_CONTENT_TYPE_PROGRAM) {
        couponCard = <CouponCard coupon={coupon} />;
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
            <FinalExamCard
              profile={profile}
              program={program}
              navigateToProfile={this.navigateToProfile}
            />
            {financialAidCard}
            {couponCard}
            <CourseListCard
              program={program}
              coupon={coupon}
              courseEnrollAddStatus={courseEnrollments.courseEnrollAddStatus}
              prices={calculatedPrices}
              key={program.id}
              openFinancialAidCalculator={this.openFinancialAidCalculator}
              addCourseEnrollment={this.addCourseEnrollment}
              openEmailComposer={this.openEmailComposer}
              closeEmailDialog={this.closeAndClearEmailComposer}
              updateEmailEdit={this.updateEmailEdit}
              sendEmail={this.closeEmailComposerAndSend}
              emailDialogVisibility={ui.emailDialogVisibility}
              email={courseTeamEmail}
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
    courseTeamEmail: state.email.courseTeamEmail,
    documents: state.documents,
    orderReceipt: state.orderReceipt,
    courseEnrollments: state.courseEnrollments,
    financialAid: state.financialAid,
    coupons: state.coupons,
  };
};

export default connect(mapStateToProps)(DashboardPage);

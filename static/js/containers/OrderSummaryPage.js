// @flow
/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';

import Loader from '../components/Loader';
import type { Profiles } from '../flow/profileTypes';
import type { CoursePrices, DashboardState } from '../flow/dashboardTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import OrderSummary from '../components/OrderSummary';
import { FETCH_PROCESSING, checkout } from '../actions';
import {
  clearDashboard,
  fetchDashboard,
} from '../actions/dashboard';
import {
  clearCoupons,
  fetchCoupons,
} from '../actions/coupons';
import type { CouponsState } from '../reducers/coupons';
import type { CheckoutState } from '../reducers';
import { createForm, findCourseRun } from '../util/util';
import { calculatePrice } from '../lib/coupon';
import { getOwnDashboard, getOwnCoursePrices } from '../reducers/util';
import { actions } from '../lib/redux_rest';
import type { RestState } from '../flow/restTypes';
import type { CheckoutResponse } from '../flow/checkoutTypes';

export const processCheckout = (result: CheckoutResponse) => {
  const { payload, url, method } = result;
  if (method === 'POST') {
    const form = createForm(url, payload);
    const body: HTMLElement = (document.querySelector("body"): any);
    body.appendChild(form);
    form.submit();
  } else {
    window.location = url;
  }
};

class OrderSummaryPage extends React.Component {
  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  props: {
    profiles:                 Profiles,
    currentProgramEnrollment: AvailableProgram,
    checkout:                 CheckoutState,
    dashboard:                DashboardState,
    dispatch:                 Dispatch,
    prices:                   RestState<CoursePrices>,
    coupons:                  CouponsState,
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
    dispatch(actions.prices.clear(SETTINGS.user.username));
    dispatch(clearCoupons());
  }

  fetchDashboard() {
    const { dashboard, dispatch } = this.props;
    if (dashboard.fetchStatus === undefined) {
      dispatch(fetchDashboard(SETTINGS.user.username));
    }
  }

  fetchCoursePrices() {
    const { prices, dispatch } = this.props;
    if (prices.getStatus === undefined) {
      dispatch(actions.prices.get(SETTINGS.user.username));
    }
  }

  fetchCoupons() {
    const { coupons, dispatch } = this.props;
    if (coupons.fetchGetStatus === undefined) {
      dispatch(fetchCoupons());
    }
  }

  updateRequirements = () => {
    this.fetchDashboard();
    this.fetchCoursePrices();
    this.fetchCoupons();
  };

  dispatchCheckout = (courseId: string) => {
    const { dispatch } = this.props;
    return dispatch(checkout(courseId)).then(processCheckout);
  };

  render() {
    const {
      checkout,
      currentProgramEnrollment,
      prices,
      dashboard,
      coupons,
      location: { query }
    }  = this.props;
    let courseRun, course, orderSummaryContent, coursePrice;
    let courseKey = query.course_key;
    [courseRun, course] = findCourseRun(dashboard.programs, run => run !== null && run.course_id === courseKey);
    if (prices.data) {
      coursePrice = prices.data.find(coursePrice => coursePrice.program_id === currentProgramEnrollment.id);
    }

    if (course && courseRun && coursePrice) {
      const [coupon, calculatedPrice] = calculatePrice(courseRun.id, course.id, coursePrice, coupons.coupons);
      let discount = null;
      if (calculatedPrice !== null && calculatedPrice !== undefined) {
        discount = coursePrice.price - calculatedPrice;
      }
      orderSummaryContent = <OrderSummary
        course={course}
        courseRun={courseRun}
        coursePrice={coursePrice}
        finalPrice={calculatedPrice}
        couponCode={coupon ? coupon.coupon_code : null}
        discount={discount}
        checkout={this.dispatchCheckout}
        checkoutStatus={checkout.fetchStatus}
      />;
    }

    const loaded = dashboard.fetchStatus !== FETCH_PROCESSING;
    return (
      <Loader loaded={loaded}>
        <div className="single-column order-summary">
          <h4 className="heading">Order Summary</h4>
          { orderSummaryContent }
        </div>
      </Loader>
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
    dashboard: getOwnDashboard(state),
    prices: getOwnCoursePrices(state),
    currentProgramEnrollment: state.currentProgramEnrollment,
    orderReceipt: state.orderReceipt,
    checkout: state.checkout,
    coupons: state.coupons,
  };
};

export default connect(mapStateToProps)(OrderSummaryPage);

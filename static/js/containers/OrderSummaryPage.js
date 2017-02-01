// @flow
/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';

import Loader from '../components/Loader';
import type { Profiles } from '../flow/profileTypes';
import type { CoursePricesState, DashboardState } from '../flow/dashboardTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import OrderSummary from '../components/OrderSummary';
import {
  FETCH_PROCESSING,
  fetchDashboard,
  fetchCoursePrices,
  clearDashboard,
  clearCoursePrices,
  checkout,
} from '../actions';
import {
  clearCoupons,
  fetchCoupons,
} from '../actions/coupons';
import type { CouponsState } from '../reducers/coupons';
import type { CheckoutState } from '../reducers';
import { createForm, findCourseRun } from '../util/util';
import { calculatePrice } from '../lib/coupon';

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
    prices:                   CoursePricesState,
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
    dispatch(clearCoursePrices());
    dispatch(clearCoupons());
  }

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

  updateRequirements = () => {
    this.fetchDashboard();
    this.fetchCoursePrices();
    this.fetchCoupons();
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
    coursePrice = prices.coursePrices.find(coursePrice => coursePrice.program_id === currentProgramEnrollment.id);

    if (course && courseRun && coursePrice) {
      const calculatedPrice = calculatePrice(courseRun.id, course.id, coursePrice, coupons.coupons);
      let discount = null;
      if (calculatedPrice !== null && calculatedPrice !== undefined) {
        discount = coursePrice.price - calculatedPrice;
      }
      orderSummaryContent = <OrderSummary
        course={course}
        courseRun={courseRun}
        coursePrice={coursePrice}
        finalPrice={calculatedPrice}
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
    dashboard: state.dashboard,
    currentProgramEnrollment: state.currentProgramEnrollment,
    prices: state.prices,
    orderReceipt: state.orderReceipt,
    checkout: state.checkout,
    coupons: state.coupons,
  };
};



export default connect(mapStateToProps)(OrderSummaryPage);

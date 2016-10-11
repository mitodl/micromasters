// @flow
import type { Dispatch } from 'redux';
import { createAction } from 'redux-actions';

import * as api from '../util/api';
import type { CheckoutResponse } from '../flow/checkoutTypes';
import type { APIErrorInfo } from '../flow/generalTypes';
import type { Action, Dispatcher } from '../flow/reduxTypes';
import type { Dashboard, CoursePrices } from '../flow/dashboardTypes';

// constants for fetch status (these are not action types)
export const FETCH_FAILURE = 'FETCH_FAILURE';
export const FETCH_SUCCESS = 'FETCH_SUCCESS';
export const FETCH_PROCESSING = 'FETCH_PROCESSING';

// dashboard list actions
export const REQUEST_DASHBOARD = 'REQUEST_DASHBOARD';
export const requestDashboard = (noSpinner: boolean) => ({
  type: REQUEST_DASHBOARD,
  payload: { noSpinner }
});

export const RECEIVE_DASHBOARD_SUCCESS = 'RECEIVE_DASHBOARD_SUCCESS';
export const receiveDashboardSuccess = (programs: Object[]): Action => ({
  type: RECEIVE_DASHBOARD_SUCCESS,
  payload: { programs }
});

export const RECEIVE_DASHBOARD_FAILURE = 'RECEIVE_DASHBOARD_FAILURE';
export const receiveDashboardFailure = (errorInfo: APIErrorInfo): Action => ({
  type: RECEIVE_DASHBOARD_FAILURE,
  payload: { errorInfo }
});

export const CLEAR_DASHBOARD = 'CLEAR_DASHBOARD';
export const clearDashboard = () => ({ type: CLEAR_DASHBOARD });

export function fetchDashboard(noSpinner: boolean = false): Dispatcher<Dashboard> {
  return (dispatch: Dispatch) => {
    dispatch(requestDashboard(noSpinner));
    return api.getDashboard().
      then(dashboard => dispatch(receiveDashboardSuccess(dashboard))).
      catch(error => {
        dispatch(receiveDashboardFailure(error));
        // the exception is assumed handled and will not be propagated
      });
  };
}

export const UPDATE_COURSE_STATUS = 'UPDATE_COURSE_STATUS';
export const updateCourseStatus = createAction(UPDATE_COURSE_STATUS, (courseId, status) => ({
  courseId, status
}));

export const REQUEST_CHECKOUT = 'REQUEST_CHECKOUT';
export const requestCheckout = (courseId: string) => ({
  type: REQUEST_CHECKOUT,
  payload: { courseId }
});

export function checkout(courseId: string): Dispatcher<CheckoutResponse> {
  return (dispatch: Dispatch) => {
    dispatch(requestCheckout(courseId));
    return api.checkout(courseId).
      then(response => {
        const {url, payload} = response;
        dispatch(receiveCheckoutSuccess(url, payload));
        return Promise.resolve(response);
      }).catch(error => {
        dispatch(receiveCheckoutFailure(error));
      });
  };
}

export const RECEIVE_CHECKOUT_SUCCESS = 'RECEIVE_CHECKOUT_SUCCESS';
export const receiveCheckoutSuccess = (url: string, payload: Object): Action => ({
  type: RECEIVE_CHECKOUT_SUCCESS,
  payload: { url, payload }
});
export const RECEIVE_CHECKOUT_FAILURE = 'RECEIVE_CHECKOUT_FAILURE';
export const receiveCheckoutFailure = (errorInfo: APIErrorInfo): Action => ({
  type: RECEIVE_CHECKOUT_FAILURE,
  payload: { errorInfo }
});

// course price actions
export const REQUEST_COURSE_PRICES = 'REQUEST_COURSE_PRICES';
export const requestCoursePrices = createAction(REQUEST_COURSE_PRICES);

export const RECEIVE_COURSE_PRICES_SUCCESS = 'RECEIVE_COURSE_PRICES_SUCCESS';
export const receiveCoursePricesSuccess = createAction(RECEIVE_COURSE_PRICES_SUCCESS);

export const RECEIVE_COURSE_PRICES_FAILURE = 'RECEIVE_COURSE_PRICES_FAILURE';
export const receiveCoursePricesFailure = createAction(RECEIVE_COURSE_PRICES_FAILURE);

export const CLEAR_COURSE_PRICES = 'CLEAR_COURSE_PRICES';
export const clearCoursePrices = createAction(CLEAR_COURSE_PRICES);

export function fetchCoursePrices(): Dispatcher<CoursePrices> {
  return (dispatch: Dispatch) => {
    dispatch(requestCoursePrices());
    return api.getCoursePrices().
      then(coursePrices => dispatch(receiveCoursePricesSuccess(coursePrices))).
      catch(error => {
        dispatch(receiveCoursePricesFailure(error));
        // the exception is assumed handled and will not be propagated
      });
  };
}

// @flow
import { assert } from 'chai';

import {
  requestDashboard,
  receiveDashboardSuccess,
  receiveDashboardFailure,
  clearDashboard,
  updateCourseStatus,
  requestCheckout,
  receiveCheckoutSuccess,
  receiveCheckoutFailure,
  requestCoursePrices,
  receiveCoursePricesSuccess,
  receiveCoursePricesFailure,
  clearCoursePrices,

  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
  CLEAR_DASHBOARD,
  UPDATE_COURSE_STATUS,
  REQUEST_CHECKOUT,
  RECEIVE_CHECKOUT_SUCCESS,
  RECEIVE_CHECKOUT_FAILURE,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
  RECEIVE_COURSE_PRICES_FAILURE,
  CLEAR_COURSE_PRICES,
} from './';
import { assertCreatedActionHelper } from './util';
import {
  DASHBOARD_RESPONSE,
  ERROR_RESPONSE,
} from '../constants';

describe('generated index action helpers', () => {
  it('should create all action creators', () => {
    [
      [requestCoursePrices, REQUEST_COURSE_PRICES],
      [receiveCoursePricesSuccess, RECEIVE_COURSE_PRICES_SUCCESS],
      [receiveCoursePricesFailure, RECEIVE_COURSE_PRICES_FAILURE],
      [clearCoursePrices, CLEAR_COURSE_PRICES],
    ].forEach(assertCreatedActionHelper);
  });

  it('requestDashboard should pass noSpinner in the payload', () => {
    assert.deepEqual(requestDashboard(true), {
      type: REQUEST_DASHBOARD,
      payload: {
        noSpinner: true
      }
    });
  });

  it('receiveDashboardSuccess should pass a list of programs', () => {
    assert.deepEqual(receiveDashboardSuccess(DASHBOARD_RESPONSE), {
      type: RECEIVE_DASHBOARD_SUCCESS,
      payload: {
        programs: DASHBOARD_RESPONSE
      }
    });
  });

  it('receiveDashboardFailure should pass an error response', () => {
    assert.deepEqual(receiveDashboardFailure(ERROR_RESPONSE), {
      type: RECEIVE_DASHBOARD_FAILURE,
      payload: {
        errorInfo: ERROR_RESPONSE
      }
    });
  });

  it('clearDashboard should only have its type', () => {
    assert.deepEqual(clearDashboard(), { type: CLEAR_DASHBOARD });
  });

  it('updateCourseStatus has courseId and status in its payload', () => {
    assert.deepEqual(updateCourseStatus('course_id', 'status'), {
      type: UPDATE_COURSE_STATUS,
      payload: {
        courseId: 'course_id',
        status: 'status'
      }
    });
  });

  it('requestCheckout passes a course id', () => {
    assert.deepEqual(requestCheckout('course_id'), {
      type: REQUEST_CHECKOUT,
      payload: { courseId: 'course_id' }
    });
  });

  it('receiveCheckoutSuccess passes a url and payload', () => {
    assert.deepEqual(receiveCheckoutSuccess('url', {'pay': 'load'}), {
      type: RECEIVE_CHECKOUT_SUCCESS,
      payload: {
        payload: {'pay': 'load'},
        url: 'url'
      }
    });
  });

  it('receiveCheckoutFailure passes errorInfo', () => {
    assert.deepEqual(receiveCheckoutFailure(ERROR_RESPONSE), {
      type: RECEIVE_CHECKOUT_FAILURE,
      payload: {
        errorInfo: ERROR_RESPONSE
      }
    });
  });
});

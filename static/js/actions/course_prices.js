// @flow
import type { Dispatch } from 'redux';

import * as api from '../lib/api';
import type { Dispatcher } from '../flow/reduxTypes';
import type { CoursePrices } from '../flow/dashboardTypes';
import { withUsername } from './util';

export const REQUEST_COURSE_PRICES = 'REQUEST_COURSE_PRICES';
export const requestCoursePrices = withUsername(REQUEST_COURSE_PRICES);

export const RECEIVE_COURSE_PRICES_SUCCESS = 'RECEIVE_COURSE_PRICES_SUCCESS';
export const receiveCoursePricesSuccess = withUsername(RECEIVE_COURSE_PRICES_SUCCESS);

export const RECEIVE_COURSE_PRICES_FAILURE = 'RECEIVE_COURSE_PRICES_FAILURE';
export const receiveCoursePricesFailure = withUsername(RECEIVE_COURSE_PRICES_FAILURE);

export const CLEAR_COURSE_PRICES = 'CLEAR_COURSE_PRICES';
export const clearCoursePrices = withUsername(CLEAR_COURSE_PRICES);

export function fetchCoursePrices(username: string, noSpinner: boolean = false): Dispatcher<CoursePrices> {
  return (dispatch: Dispatch) => {
    dispatch(requestCoursePrices(username, noSpinner));
    return api.getCoursePrices().
      then(coursePrices => dispatch(receiveCoursePricesSuccess(username, coursePrices))).
      catch(error => {
        dispatch(receiveCoursePricesFailure(username, error));
        // the exception is assumed handled and will not be propagated
      });
  };
}

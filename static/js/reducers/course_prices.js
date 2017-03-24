// @flow
import _ from 'lodash';
import R from 'ramda';

import {
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
  RECEIVE_COURSE_PRICES_FAILURE,
  CLEAR_COURSE_PRICES,
} from '../actions/course_prices';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import type { Action } from '../flow/reduxTypes';
import type {
  CoursePricesState,
  CoursePriceReducerState,
} from '../flow/dashboardTypes';
import { updateStateByUsername } from './util';

export const INITIAL_COURSE_PRICES_STATE: CoursePricesState = {
  coursePrices: [],
  noSpinner:    false
};

export const prices = (state: CoursePriceReducerState = {}, action: Action<any, string>) => {
  const { meta: username } = action;
  switch (action.type) {
  case REQUEST_COURSE_PRICES:
    if (action.payload === true) {
      return updateStateByUsername(state, username,
        _.merge({}, state[username] || {}, { fetchStatus: FETCH_PROCESSING, noSpinner: true })
      );
    } else {
      return updateStateByUsername(
        R.dissoc(username, state),
        username,
        _.merge({}, INITIAL_COURSE_PRICES_STATE, { fetchStatus: FETCH_PROCESSING })
      );
    }
  case RECEIVE_COURSE_PRICES_SUCCESS:
    return updateStateByUsername(state, username, {
      fetchStatus: FETCH_SUCCESS,
      coursePrices: action.payload,
      noSpinner: false,
    });
  case RECEIVE_COURSE_PRICES_FAILURE:
    return updateStateByUsername(state, username, {
      fetchStatus: FETCH_FAILURE,
      errorInfo: action.payload
    });
  case CLEAR_COURSE_PRICES:
    return updateStateByUsername(R.dissoc(username, state), username, INITIAL_COURSE_PRICES_STATE);
  default:
    return state;
  }
};

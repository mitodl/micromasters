// @flow
import moment from 'moment';

import {
  SET_TIMEOUT_ACTIVE,
  SET_INITIAL_TIME,
} from '../actions/order_receipt';

export type OrderReceiptState = {
  initialTime: string,
  timeoutActive: boolean,
};

export const INITIAL_ORDER_RECEIPT_STATE = {
  timeoutActive: false,
  initialTime: moment().toISOString()
};

export const orderReceipt = (state: OrderReceiptState = INITIAL_ORDER_RECEIPT_STATE, action) => {
  switch (action.type) {
  case SET_TIMEOUT_ACTIVE:
    return { ...state, timeoutActive: action.payload };
  case SET_INITIAL_TIME:
    return { ...state, initialTime: action.payload };
  default:
    return state;
  }
};

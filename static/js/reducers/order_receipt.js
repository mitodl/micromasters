// @flow
// Order receipt reducer - PAYMENTS DISCONTINUED IN 2021
// This module is a stub to maintain compatibility

export type OrderReceiptState = {
  timeoutActive: boolean,
  initialTime: ?Date
}

const INITIAL_STATE: OrderReceiptState = {
  timeoutActive: false,
  initialTime:   null
}

export const orderReceiptReducer = (
  state: OrderReceiptState = INITIAL_STATE,
  action: Object
): OrderReceiptState => {
  return state
}

export default orderReceiptReducer

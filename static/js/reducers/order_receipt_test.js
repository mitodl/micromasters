import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';

import rootReducer from '../reducers';
import {
  setInitialTime,
  setTimeoutActive,
} from '../actions/order_receipt';
import { createAssertReducerResultState } from '../util/test_utils';
import type { OrderReceiptState } from './order_receipt';

describe('order receipt reducer', () => {
  let sandbox, store, assertReducerResultState: (
    a: () => Action, f: ((s: any) => OrderReceiptState), d: any
  ) => void;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    store = configureTestStore(rootReducer);
    assertReducerResultState = createAssertReducerResultState(store, state => state.orderReceipt);
  });

  afterEach(() => {
    sandbox.restore();

    store = null;
  });

  it('should let you set timeoutActive', () => {
    assertReducerResultState(setTimeoutActive, receipt => receipt.timeoutActive, false);
  });

  it('should let you set the initial time, and the default is a valid time', () => {
    let initialTime = store.getState().orderReceipt.initialTime;
    assert(moment(initialTime).isValid());

    assertReducerResultState(setInitialTime, receipt => receipt.initialTime, initialTime);
  });
});


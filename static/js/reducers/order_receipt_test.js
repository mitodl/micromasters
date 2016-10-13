import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';
import moment from 'moment';

import { orderReceipt } from './order_receipt';
import {
  setInitialTime,
  setTimeoutActive,

  SET_INITIAL_TIME,
  SET_TIMEOUT_ACTIVE,
} from '../actions/order_receipt';

describe('order receipt reducer', () => {
  let sandbox, store, dispatchThen;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(orderReceipt);
    dispatchThen = store.createDispatchThen();
  });

  afterEach(() => {
    sandbox.restore();

    store = null;
    dispatchThen = null;
  });

  describe('dialog visibility', () => {
    [true, false].forEach(bool => {
      it(`should let you set timeoutActive to ${bool}`, () => {
        return dispatchThen(setTimeoutActive(bool), [
          SET_TIMEOUT_ACTIVE
        ]).then(state => {
          assert.equal(state.timeoutActive, bool);
        });
      });
    });

    it('has an initial time', () => {
      return dispatchThen({type: "fake"}, ['fake']).then(state => {
        // value is already set to valid timestamp
        assert(moment(state.initialTime).isValid());
      });
    });

    it('should let you set the initial time', () => {
      return dispatchThen(setInitialTime("time"), [SET_INITIAL_TIME]).then(state => {
        assert.equal(state.initialTime, "time");
      });
    });
  });
});


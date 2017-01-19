// @flow
import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';

import {
  REQUEST_ATTACH_COUPON,
  requestAttachCoupon,
  RECEIVE_ATTACH_COUPON_SUCCESS,
  RECEIVE_ATTACH_COUPON_FAILURE,
  attachCoupon,
  REQUEST_FETCH_COUPONS,
  RECEIVE_FETCH_COUPONS_SUCCESS,
  RECEIVE_FETCH_COUPONS_FAILURE,
  fetchCoupons,
  clearCoupons,
  setRecentlyAttachedCoupon,
} from '../actions/coupons';
import { INITIAL_COUPONS_STATE } from '../reducers/coupons';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import rootReducer from '../reducers';
import * as api from '../lib/api';
import type { CouponsState } from '../reducers/coupons';
import type { AssertReducerResultState } from '../flow/reduxTypes';
import { createAssertReducerResultState } from '../util/test_utils';

describe('coupon reducers', () => {
  let sandbox, store, dispatchThen, assertReducerResultState: AssertReducerResultState<CouponsState>;
  let attachCouponStub, getCouponsStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.coupons);
    assertReducerResultState = createAssertReducerResultState(store, state => state.coupons);
    getCouponsStub = sandbox.stub(api, 'getCoupons');
    attachCouponStub = sandbox.stub(api, 'attachCoupon');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should process attaching a coupon', () => {
    return dispatchThen(requestAttachCoupon("a b"), [
      REQUEST_ATTACH_COUPON
    ]).then(state => {
      assert.equal(state.fetchPostStatus, FETCH_PROCESSING);
    });
  });

  it('should let you attach a coupon', () => {
    let code = "a b";
    attachCouponStub.returns(Promise.resolve());
    return dispatchThen(attachCoupon(code), [
      REQUEST_ATTACH_COUPON,
      RECEIVE_ATTACH_COUPON_SUCCESS,
    ]).then(state => {
      let expectation = {
        fetchPostStatus: FETCH_SUCCESS,
        coupons: [],
        recentlyAttachedCoupon: null,
      };
      assert.deepEqual(state, expectation);
      assert.isTrue(attachCouponStub.calledWith(code));
    });
  });

  it('should fail to attach a coupon', () => {
    attachCouponStub.returns(Promise.reject());
    let code = "a b";
    return dispatchThen(attachCoupon(code), [
      REQUEST_ATTACH_COUPON,
      RECEIVE_ATTACH_COUPON_FAILURE,
    ]).then(state => {
      let expectation = {
        fetchPostStatus: FETCH_FAILURE,
        coupons: [],
        recentlyAttachedCoupon: null,
      };
      assert.deepEqual(state, expectation);
      assert.isTrue(attachCouponStub.calledWith(code));
    });
  });

  it('should let you fetch coupons then clear coupon state', () => {
    let coupons = ["some coupons"];
    getCouponsStub.returns(Promise.resolve(coupons));
    return dispatchThen(fetchCoupons(), [
      REQUEST_FETCH_COUPONS,
      RECEIVE_FETCH_COUPONS_SUCCESS
    ]).then(state => {
      assert.deepEqual(state, {
        fetchGetStatus: FETCH_SUCCESS,
        coupons: coupons,
        recentlyAttachedCoupon: null,
      });
      assert.isTrue(getCouponsStub.calledWith());

      store.dispatch(clearCoupons());
      assert.deepEqual(store.getState().coupons, INITIAL_COUPONS_STATE);
    });
  });

  it('should fail to fetch coupons', () => {
    getCouponsStub.returns(Promise.reject());
    return dispatchThen(fetchCoupons(), [
      REQUEST_FETCH_COUPONS,
      RECEIVE_FETCH_COUPONS_FAILURE
    ]).then(state => {
      assert.deepEqual(state, {
        fetchGetStatus: FETCH_FAILURE,
        coupons: [],
        recentlyAttachedCoupon: null,
      });
      assert.isTrue(getCouponsStub.calledWith());
    });
  });

  it('should let you set a recently attached coupon', () => {
    assertReducerResultState(
      setRecentlyAttachedCoupon,
      coupons => coupons.recentlyAttachedCoupon,
      null
    );
  });
});

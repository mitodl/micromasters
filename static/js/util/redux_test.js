// @flow
import { assert } from 'chai';
import sinon from 'sinon';

import {
  createActionHelper,
  createSimpleActionHelpers,
  createAsyncActionHelpers,
} from './redux';

describe('redux helpers', () => {
  const MY_ACTION = 'MY_ACTION';
  let dispatch = sinon.spy();
  let actionCreator = (arg) => ({
    type: MY_ACTION, payload: arg
  });

  describe('createActionHelper', () => {
    let helper;
    beforeEach(() => {
      helper = createActionHelper(dispatch, actionCreator);
    });

    it('should return a function', () => {
      assert.isFunction(helper);
    });

    it('should return a function that calls dispatch', () => {
      helper(null);
      assert(dispatch.called);
    });

    it('should return a function that passes arguments to dispatch', () => {
      helper(3);
      assert(dispatch.calledWith({
        type: MY_ACTION, payload: 3
      }));
    });
  });

  describe('createSimpleActionHelpers', () => {
    let actionList = [
      ['actionCreator', actionCreator],
    ];

    let actions;
    beforeEach(() => {
      actions = createSimpleActionHelpers(dispatch, actionList);
    });

    it('should return an array of objects containing functions', () => {
      assert.isArray(actions);
      let [ { actionCreator } ] = actions;
      assert.isFunction(actionCreator);
    });

    it('the functions returned should call dispatch with arguments', () => {
      let [ { actionCreator } ] = actions;
      actionCreator(3);
      assert(dispatch.calledWith({
        type: MY_ACTION, payload: 3
      }));
    });
  });

  describe('createAsyncActionHelpers', () => {
    const MY_ASYNC_ACTION = 'MY_ASYNC_ACTION';
    let asyncActionCreator = arg => (dispatch => dispatch({
      type: MY_ASYNC_ACTION, payload: arg
    }));
    let actionList = [
      ['asyncActionCreator', asyncActionCreator],
    ];

    let dispatchSpy = sinon.stub().returns(Promise.resolve());
    let asyncDispatch = (createdActionFunc) => {
      if ( typeof(createdActionFunc) === 'function' ) {
        return createdActionFunc(dispatchSpy);
      }
    };


    let actions;
    beforeEach(() => {
      actions = createAsyncActionHelpers(asyncDispatch, actionList);
    });

    it('should return an array of objects containing functions', () => {
      assert.isArray(actions);
      let [ { asyncActionCreator } ] = actions;
      assert.isFunction(asyncActionCreator);
    });


    it('should return an array of asyncActionCreators', () => {
      let [ { asyncActionCreator } ] = actions;
      let dispatched = asyncActionCreator(2);
      assert.isFulfilled(dispatched);
      assert(dispatchSpy.calledWith({
        type: MY_ASYNC_ACTION, payload: 2
      }));
    });
  });
});

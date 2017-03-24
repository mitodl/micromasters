/* global SETTINGS: false */
import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';

import rootReducer from '../reducers';
import {
  fetchDashboard,
  clearDashboard,
  receiveDashboardSuccess,
  updateCourseStatus,
  requestDashboard,

  UPDATE_COURSE_STATUS,
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
  CLEAR_DASHBOARD,
} from '../actions/dashboard';
import * as api from '../lib/api';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS
} from '../actions/index';
import { DASHBOARD_RESPONSE } from '../test_constants';

describe('dashboard reducers', () => {
  let sandbox, store, dispatchThen, dashboardStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.dashboard);
    dashboardStub = sandbox.stub(api, 'getDashboard');
  });

  afterEach(() => {
    sandbox.restore();
    store = null;
    dispatchThen = null;
  });

  it('should have an empty default state', () => {
    return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
      assert.deepEqual(state, {});
    });
  });

  it('should fetch the dashboard successfully then clear it', () => {
    dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE));

    return dispatchThen(fetchDashboard(SETTINGS.user.username), [
      REQUEST_DASHBOARD,
      RECEIVE_DASHBOARD_SUCCESS
    ]).then(state => {
      let dashboardState = state[SETTINGS.user.username];
      assert.deepEqual(dashboardState.programs, DASHBOARD_RESPONSE.programs);
      assert.equal(dashboardState.isEdxDataFresh, DASHBOARD_RESPONSE.is_edx_data_fresh);
      assert.equal(dashboardState.fetchStatus, FETCH_SUCCESS);

      return dispatchThen(clearDashboard(SETTINGS.user.username), [CLEAR_DASHBOARD]).then(state => {
        let dashboardState = state[SETTINGS.user.username];
        assert.deepEqual(dashboardState, { programs: [], isEdxDataFresh: true, noSpinner: false });
      });
    });
  });

  it('should fail to fetch the dashboard', () => {
    dashboardStub.returns(Promise.reject());
    return dispatchThen(fetchDashboard(SETTINGS.user.username), [
      REQUEST_DASHBOARD,
      RECEIVE_DASHBOARD_FAILURE,
    ]).then(state => {
      let dashboardState = state[SETTINGS.user.username];
      assert.equal(dashboardState.fetchStatus, FETCH_FAILURE);
    });
  });

  it("should update a course run's status", () => {
    store.dispatch(receiveDashboardSuccess(SETTINGS.user.username, DASHBOARD_RESPONSE));

    let getRun = programs => programs[1].courses[0].runs[0];

    let run = getRun(DASHBOARD_RESPONSE.programs);
    assert.notEqual(run.status, 'new_status');
    return dispatchThen(
      updateCourseStatus(SETTINGS.user.username, run.course_id, 'new_status'),
      [UPDATE_COURSE_STATUS]
    ).then(state => {
      let dashboardState = state[SETTINGS.user.username];
      assert.equal(getRun(dashboardState.programs).status, 'new_status');
    });
  });

  describe('support for multiple dashboards', () => {
    let username = 'username';
    let _username = '_username';

    let successExpectation = {
      programs: DASHBOARD_RESPONSE.programs,
      isEdxDataFresh: DASHBOARD_RESPONSE.is_edx_data_fresh,
      fetchStatus: FETCH_SUCCESS,
      noSpinner: false
    };

    beforeEach(() => {
      dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE));
      store.dispatch(receiveDashboardSuccess(username, DASHBOARD_RESPONSE));
    });

    it('should let you fetch two different dashboards', () => {
      return dispatchThen(fetchDashboard(_username), [
        REQUEST_DASHBOARD,
        RECEIVE_DASHBOARD_SUCCESS
      ]).then(state => {
        assert.deepEqual(state, {
          [username]: successExpectation,
          [_username]: successExpectation,
        });
      });
    });

    it('should let you clear just one dashboard', () => {
      store.dispatch(receiveDashboardSuccess(_username, DASHBOARD_RESPONSE));
      return dispatchThen(clearDashboard(username), [
        CLEAR_DASHBOARD
      ]).then(state => {
        assert.deepEqual(state, {
          [_username]: successExpectation,
          [username]: { programs: [], isEdxDataFresh: true,  noSpinner: false }
        });
      });
    });

    it('should let you fail to fetch just one dashboard', () => {
      dashboardStub.returns(Promise.reject('err'));
      return dispatchThen(fetchDashboard(_username), [
        REQUEST_DASHBOARD,
        RECEIVE_DASHBOARD_FAILURE,
      ]).then(state => {
        assert.deepEqual(state, {
          [username]: successExpectation,
          [_username]: {
            fetchStatus: FETCH_FAILURE,
            errorInfo: 'err',
            programs: [],
            isEdxDataFresh: true,
            noSpinner: false
          }
        });
      });
    });

    it('should let you update a course runs status', () => {
      store.dispatch(receiveDashboardSuccess(_username, DASHBOARD_RESPONSE));

      let getRun = programs => programs[1].courses[0].runs[0];

      let run = getRun(DASHBOARD_RESPONSE.programs);
      assert.notEqual(run.status, 'new_status');

      return dispatchThen(
        updateCourseStatus(_username, run.course_id, 'new_status'),
        [UPDATE_COURSE_STATUS]
      ).then(state => {
        assert.deepEqual(state[username], successExpectation);
        assert.deepEqual(getRun(state[_username].programs).status, 'new_status');
      });
    });

    it('should let you set noSpinner true', () => {
      return dispatchThen(
        requestDashboard('username', true),
        [REQUEST_DASHBOARD]
      ).then((state) => {
        assert.deepEqual(state, {
          "username": {
            noSpinner: true,
            isEdxDataFresh: true,
            programs: DASHBOARD_RESPONSE.programs,
            fetchStatus: FETCH_PROCESSING
          }
        });
      });
    });
  });
});

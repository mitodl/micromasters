import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { createMemoryHistory } from 'react-router';
import { mergePersistedState }  from 'redux-localstorage';
import { compose } from 'redux';

import * as api from '../lib/api';
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  PROGRAM_ENROLLMENTS,
  USER_PROFILE_RESPONSE,
} from '../constants';
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
} from '../actions';
import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
} from '../actions/profile';
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
} from '../actions/programs';
import rootReducer from '../reducers';
import { makeDashboardRoutes } from '../dashboard_routes';
import { localStorageMock } from '../util/test_utils';
import { configureMainTestStore } from '../store/configureStore';

class IntegrationTestHelper {
  constructor() {
    if ( ! window.localStorage ) {
      window.localStorage = localStorageMock();
    }
    this.sandbox = sinon.sandbox.create();
    this.store = configureMainTestStore((...args) => {
      // uncomment to listen on dispatched actions
      // console.log(args);
      const reducer = compose(
        mergePersistedState()
      )(rootReducer);
      return reducer(...args);
    });

    this.listenForActions = this.store.createListenForActions();
    this.dispatchThen = this.store.createDispatchThen();

    this.dashboardStub = this.sandbox.stub(api, 'getDashboard');
    this.dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE));
    this.coursePricesStub = this.sandbox.stub(api, 'getCoursePrices');
    this.coursePricesStub.returns(Promise.resolve(COURSE_PRICES_RESPONSE));
    this.profileGetStub = this.sandbox.stub(api, 'getUserProfile');
    this.profileGetStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
    this.enrollmentsGetStub = this.sandbox.stub(api, 'getProgramEnrollments');
    this.enrollmentsGetStub.returns(Promise.resolve(PROGRAM_ENROLLMENTS));
    this.browserHistory = createMemoryHistory();
    this.currentLocation = null;
    this.browserHistory.listen(url => {
      this.currentLocation = url;
    });
  }

  cleanup() {
    this.sandbox.restore();
    window.localStorage.reset();
  }

  renderComponent(url = "/", extraTypesToAssert = [], isSuccessExpected = true) {
    let expectedTypes = [
      REQUEST_DASHBOARD,
      REQUEST_COURSE_PRICES,
      REQUEST_GET_USER_PROFILE,
      REQUEST_GET_PROGRAM_ENROLLMENTS,
    ];
    let expectedSuccessTypes = [
      RECEIVE_DASHBOARD_SUCCESS,
      RECEIVE_GET_USER_PROFILE_SUCCESS,
      RECEIVE_COURSE_PRICES_SUCCESS,
      RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
    ];

    // if the success is expected  update the list with the success types
    if (isSuccessExpected) {
      expectedTypes.push(...expectedSuccessTypes);
    }
    expectedTypes.push(...extraTypesToAssert);

    let wrapper, div;

    return this.listenForActions(expectedTypes, () => {
      this.browserHistory.push(url);
      div = document.createElement("div");
      wrapper = mount(
        <div>
          { makeDashboardRoutes(this.browserHistory, this.store, () => null) }
        </div>,
        {
          attachTo: div
        }
      );
    }).then(() => {
      return Promise.resolve([wrapper, div]);
    });
  }
}

export default IntegrationTestHelper;

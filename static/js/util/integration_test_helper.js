import React from 'react';
import { mount } from 'enzyme';
import configureTestStore from 'redux-asserts';
import sinon from 'sinon';
import { createMemoryHistory } from 'react-router';

import * as api from '../util/api';
import {
  DASHBOARD_RESPONSE,
  USER_PROFILE_RESPONSE,
} from '../constants';
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
} from '../actions';
import rootReducer from '../reducers';
import { makeDashboardRoutes } from '../dashboard_routes';

class IntegrationTestHelper {

  constructor() {
    this.sandbox = sinon.sandbox.create();
    this.store = configureTestStore((...args) => {
      // uncomment to listen on dispatched actions
      // console.log(args);
      return rootReducer(...args);
    });

    this.listenForActions = this.store.createListenForActions();
    this.dispatchThen = this.store.createDispatchThen();

    this.dashboardStub = this.sandbox.stub(api, 'getDashboard');
    this.dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE));
    this.profileGetStub = this.sandbox.stub(api, 'getUserProfile');
    this.profileGetStub.returns(Promise.resolve(USER_PROFILE_RESPONSE));
    this.browserHistory = createMemoryHistory();
    this.currentLocation = null;
    this.browserHistory.listen(url => {
      this.currentLocation = url;
    });
  }

  cleanup() {
    this.sandbox.restore();
  }

  renderComponent(url = "/", extraTypesToAssert = [], isSuccessExpected = true) {
    let expectedTypes = [
      REQUEST_DASHBOARD,
      REQUEST_GET_USER_PROFILE
    ];
    let expectedSuccessTypes = [
      RECEIVE_DASHBOARD_SUCCESS,
      RECEIVE_GET_USER_PROFILE_SUCCESS
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

/* global SETTINGS: false */
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
  PROGRAMS,
  USER_PROFILE_RESPONSE,
} from '../test_constants';
import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
} from '../actions/profile';
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
} from '../actions/programs';
import rootReducer from '../reducers';
import DashboardRouter from '../DashboardRouter';
import { testRoutes } from './test_utils';
import { configureMainTestStore } from '../store/configureStore';
import type { Action } from '../flow/reduxTypes';
import type { TestStore } from '../flow/reduxTypes';
import type { Sandbox } from '../flow/sinonTypes';

export default class IntegrationTestHelper {
  listenForActions: (a: Array<string>, f: Function) => Promise<*>;
  dispatchThen: (a: Action) => Promise<*>;
  sandbox: Sandbox;
  store: TestStore;
  browserHistory: History;

  constructor() {
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
    this.couponsStub = this.sandbox.stub(api, 'getCoupons');
    this.couponsStub.returns(Promise.resolve([]));
    this.profileGetStub = this.sandbox.stub(api, 'getUserProfile');
    this.profileGetStub.withArgs(SETTINGS.user.username).returns(Promise.resolve(USER_PROFILE_RESPONSE));
    this.programsGetStub = this.sandbox.stub(api, 'getPrograms');
    this.programsGetStub.returns(Promise.resolve(PROGRAMS));
    this.scrollIntoViewStub = this.sandbox.stub();
    window.HTMLDivElement.prototype.scrollIntoView = this.scrollIntoViewStub;
    window.HTMLFieldSetElement.prototype.scrollIntoView = this.scrollIntoViewStub;
    this.browserHistory = createMemoryHistory();
    this.currentLocation = null;
    this.browserHistory.listen(url => {
      this.currentLocation = url;
    });
  }

  cleanup() {
    this.sandbox.restore();
  }

  /**
   * Renders the components using the given URL.
   * @param url {String} The react-router URL
   * @param typesToAssert {Array<String>|null} A list of redux actions to listen for.
   * If null, actions types for the success case is assumed.
   * @returns {Promise<*>} A promise which provides [wrapper, div] on success
   */
  renderComponent(url: string = "/", typesToAssert: Array<string>|null = null): Promise<*> {
    let expectedTypes = [];
    if (typesToAssert === null) {
      expectedTypes = [
        REQUEST_GET_USER_PROFILE,
        REQUEST_GET_PROGRAM_ENROLLMENTS,
        RECEIVE_GET_USER_PROFILE_SUCCESS,
        RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
      ];
    } else {
      expectedTypes = typesToAssert;
    }

    let wrapper, div;

    return this.listenForActions(expectedTypes, () => {
      this.browserHistory.push(url);
      div = document.createElement("div");
      wrapper = mount(
        <div>
          <DashboardRouter
            browserHistory={this.browserHistory}
            store={this.store}
            onRouteUpdate={() => null}
            routes={testRoutes}
          />
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

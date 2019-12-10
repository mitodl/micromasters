/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import sinon from "sinon"
import { browserHistory } from "react-router"
import { mergePersistedState } from "redux-localstorage"
import { compose } from "redux"
import fetchMock from "fetch-mock"

import * as api from "../lib/api"
import * as djangoFetch from "redux-hammock/django_csrf_fetch"
import * as authFetch from "../lib/auth"
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  PROGRAM_LEARNERS_RESPONSE,
  PROGRAMS,
  USER_PROFILE_RESPONSE,
  ATTACH_COUPON_RESPONSE,
  GET_AUTOMATIC_EMAILS_RESPONSE
} from "../test_constants"
import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS
} from "../actions/profile"
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
} from "../actions/programs"
import rootReducer from "../reducers"
import DashboardRouter from "../DashboardRouter"
import { testRoutes } from "./test_utils"
import { configureMainTestStore } from "../store/configureStore"
import type { Sandbox } from "../flow/sinonTypes"

export default class IntegrationTestHelper {
  sandbox: Sandbox
  store: TestStore
  browserHistory: History

  constructor() {
    this.sandbox = sinon.sandbox.create()
    this.store = configureMainTestStore((...args) => {
      // uncomment to listen on dispatched actions
      // console.log(args[1].type);
      const reducer = compose(mergePersistedState())(rootReducer)
      return reducer(...args)
    })

    // we need this to deal with the 'endpoint' objects, it's now necessary
    // to directly mock out the fetch call because at module load time the
    // endpoint object already holds a reference to the unmocked API function
    // (e.g. getCoupons) which Sinon doesn't seem to be able to deal with.
    this.fetchJSONWithCSRFStub = this.sandbox.stub(
      djangoFetch,
      "fetchJSONWithCSRF"
    )

    this.fetchJSONWithAuthStub = this.sandbox.stub(
      authFetch,
      "fetchJSONWithAuthToken"
    )

    this.listenForActions = this.store.createListenForActions()
    this.dispatchThen = this.store.createDispatchThen()

    this.dashboardStub = this.sandbox.stub(api, "getDashboard")
    this.dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE))
    this.coursePricesStub = this.fetchJSONWithCSRFStub.withArgs(
      `/api/v0/course_prices/${SETTINGS.user.username}/`
    )
    this.coursePricesStub.returns(Promise.resolve(COURSE_PRICES_RESPONSE))

    fetchMock.mock("/api/v0/mail/automatic_email/", () => {
      return { body: JSON.stringify(GET_AUTOMATIC_EMAILS_RESPONSE) }
    })
    this.programLearnersStub = this.fetchJSONWithCSRFStub.withArgs(
      `/api/v0/programlearners/${PROGRAMS[0].id}/`
    )
    this.programLearnersStub.returns(Promise.resolve(PROGRAM_LEARNERS_RESPONSE))

    this.discussionsFrontpageStub = this.fetchJSONWithAuthStub.withArgs(
      "http://open.discussions/api/v0/frontpage/"
    )
    this.discussionsFrontpageStub.returns(Promise.resolve([]))

    this.couponsStub = this.sandbox.stub(api, "getCoupons")
    this.couponsStub.returns(Promise.resolve([]))
    this.profileGetStub = this.sandbox.stub(api, "getUserProfile")
    this.profileGetStub
      .withArgs(SETTINGS.user.username)
      .returns(Promise.resolve(USER_PROFILE_RESPONSE))
    this.programsGetStub = this.sandbox.stub(api, "getPrograms")
    this.programsGetStub.returns(Promise.resolve(PROGRAMS))
    this.attachCouponStub = this.sandbox.stub(api, "attachCoupon")
    this.attachCouponStub.returns(Promise.resolve(ATTACH_COUPON_RESPONSE))
    this.skipFinancialAidStub = this.sandbox.stub(api, "skipFinancialAid")
    this.skipFinancialAidStub.returns(Promise.resolve())
    this.addFinancialAidStub = this.sandbox.stub(api, "addFinancialAid")
    this.addFinancialAidStub.returns(Promise.resolve())
    this.sendSearchResultMail = this.sandbox.stub(api, "sendSearchResultMail")
    this.sendSearchResultMail.returns(Promise.resolve())
    this.sendCourseTeamMail = this.sandbox.stub(api, "sendCourseTeamMail")
    this.sendCourseTeamMail.returns(Promise.resolve())
    this.sendLearnerMail = this.sandbox.stub(api, "sendLearnerMail")
    this.sendLearnerMail.returns(Promise.resolve())
    this.scrollIntoViewStub = this.sandbox.stub()
    window.HTMLDivElement.prototype.scrollIntoView = this.scrollIntoViewStub
    window.HTMLFieldSetElement.prototype.scrollIntoView = this.scrollIntoViewStub
  }

  cleanup() {
    this.sandbox.restore()
  }

  /**
   * Renders the components using the given URL.
   * @param url {String} The react-router URL
   * @param typesToAssert {Array<String>|null} A list of redux actions to listen for.
   * If null, actions types for the success case is assumed.
   * @returns {Promise<*>} A promise which provides [wrapper, div] on success
   */
  renderComponent(
    url: string = "/",
    typesToAssert: Array<string> | null = null
  ): Promise<*> {
    let expectedTypes = []
    if (typesToAssert === null) {
      expectedTypes = [
        REQUEST_GET_USER_PROFILE,
        REQUEST_GET_PROGRAM_ENROLLMENTS,
        RECEIVE_GET_USER_PROFILE_SUCCESS,
        RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
      ]
    } else {
      expectedTypes = typesToAssert
    }

    let wrapper, div

    return this.listenForActions(expectedTypes, () => {
      browserHistory.push(url)
      div = document.createElement("div")
      div.setAttribute("id", "integration_test_div")
      document.body.appendChild(div)
      wrapper = mount(
        <div>
          <DashboardRouter
            browserHistory={browserHistory}
            store={this.store}
            onRouteUpdate={() => null}
            routes={testRoutes}
          />
        </div>,
        {
          attachTo: div
        }
      )
    }).then(() => {
      wrapper.update()
      return Promise.resolve([wrapper, div])
    })
  }
}

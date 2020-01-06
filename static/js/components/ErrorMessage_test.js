/* global SETTINGS: false */
import React from "react"
import ReactTestUtils from "react-dom/test-utils"
import { assert } from "chai"
import _ from "lodash"

import { SET_LEARNER_PAGE_DIALOG_VISIBILITY } from "../actions/ui"
import {
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_FAILURE,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_FAILURE,
  CLEAR_PROFILE_EDIT
} from "../actions/profile"
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
} from "../actions/programs"
import {
  DASHBOARD_RESPONSE,
  ERROR_RESPONSE,
  USER_PROFILE_RESPONSE
} from "../test_constants"
import IntegrationTestHelper from "../util/integration_test_helper"
import { makeStrippedHtml } from "../util/util"
import * as api from "../lib/api"
import {
  DASHBOARD_SUCCESS_ACTIONS,
  DASHBOARD_ERROR_ACTIONS,
  DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS
} from "../containers/test_util"
import ErrorMessage from "./ErrorMessage"
import { actions } from "../lib/redux_rest"

describe("ErrorMessage", () => {
  let errorString = `Sorry, we were unable to load the data necessary
      to process your request. Please reload the page.`
  errorString = errorString.replace(/\s\s+/g, " ")

  let contactExpectation = `If the error persists, please contact
      ${SETTINGS.support_email} specifying this entire error message.`
  contactExpectation = contactExpectation.replace(/\s\s+/g, " ")

  describe("unit tests", () => {
    const renderErrorMessage = props => {
      return makeStrippedHtml(<ErrorMessage {...props} />)
    }
    const codeAttributes = [["error_code", "500"], ["errorStatusCode", 404]]
    const messageAttributes = [
      ["user_message", "A message"],
      ["detail", "Some details"]
    ]

    codeAttributes.forEach(([codeAttribute, code]) => {
      messageAttributes.forEach(([msgAttribute, message]) => {
        it(`should render an error and message on the ${codeAttribute} and ${msgAttribute} attributes`, () => {
          const that = {
            errorInfo: {
              [codeAttribute]: code,
              [msgAttribute]:  message
            }
          }
          const errorMessage = renderErrorMessage(that)
          assert.include(errorMessage, String(code))
          assert.include(errorMessage, errorString)
          assert.include(errorMessage, contactExpectation)
          assert.include(errorMessage, message)
        })
      })
    })
  })

  describe("showing errors on pages", () => {
    let renderComponent, helper, patchUserProfileStub, listenForActions

    const confirmErrorMessage = (div, codeMessage, extraInfo = "") => {
      const alert = div.querySelector(".alert-message")
      const messages = alert.getElementsByTagName("p")
      assert.deepEqual(messages[0].textContent, codeMessage)
      assert.deepEqual(messages[1].textContent, extraInfo)
      assert.deepEqual(messages[2].textContent, contactExpectation)
    }

    beforeEach(() => {
      helper = new IntegrationTestHelper()
      renderComponent = helper.renderComponent.bind(helper)
      patchUserProfileStub = helper.sandbox.stub(api, "patchUserProfile")
      listenForActions = helper.listenForActions.bind(helper)

      helper.profileGetStub.withArgs(SETTINGS.user.username).returns(
        Promise.resolve({
          ...USER_PROFILE_RESPONSE,
          username: SETTINGS.user.username
        })
      )
    })

    afterEach(() => {
      helper.cleanup()
    })

    describe("dashboard page", () => {
      it("error from the backend triggers error message in dashboard", () => {
        helper.dashboardStub.returns(Promise.reject(ERROR_RESPONSE))

        return renderComponent("/dashboard", DASHBOARD_ERROR_ACTIONS).then(
          ([, div]) => {
            confirmErrorMessage(
              div,
              `AB123 ${errorString}`,
              "Additional info: custom error message for the user."
            )
          }
        )
      })

      it("the error from the backend does not need to be complete", () => {
        const response = _.cloneDeep(ERROR_RESPONSE)
        delete response.user_message
        helper.dashboardStub.returns(Promise.reject(response))

        return renderComponent("/dashboard", DASHBOARD_ERROR_ACTIONS).then(
          ([, div]) => {
            confirmErrorMessage(div, `AB123 ${errorString}`)
          }
        )
      })

      it("the error from the backend does not need to exist at all as long as there is an http error", () => {
        helper.dashboardStub.returns(
          Promise.reject({
            errorStatusCode: 500
          })
        )

        return renderComponent("/dashboard", DASHBOARD_ERROR_ACTIONS).then(
          ([, div]) => {
            confirmErrorMessage(div, `500 ${errorString}`)
          }
        )
      })

      it("a regular response does not show the error", () => {
        helper.dashboardStub.returns(Promise.resolve(DASHBOARD_RESPONSE))

        return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
          ([, div]) => {
            const message = div.getElementsByClassName("alert-message")[0]
            assert.equal(message, undefined)
          }
        )
      })

      it("shows enrollment card if there are no programs", () => {
        helper.dashboardStub.returns(Promise.resolve([]))
        const expectedActions = DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS.filter(
          actionType =>
            actionType !== actions.discussionsFrontpage.get.successType
        )

        return renderComponent("/dashboard", expectedActions).then(
          ([wrapper]) => {
            const message = wrapper.find(".page-content").text()
            assert.equal(
              message,
              "You are not currently enrolled in any programsEnroll in a MicroMasters Program"
            )
          }
        )
      })

      it("shows enrollment card if there is no matching current program enrollment", () => {
        helper.programsGetStub.returns(Promise.resolve([]))
        const expectedActions = DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS.filter(
          actionType =>
            actionType !== actions.discussionsFrontpage.get.successType
        )

        return renderComponent("/dashboard", expectedActions).then(
          ([wrapper]) => {
            const message = wrapper.find(".page-content").text()
            assert.equal(
              message,
              "You are not currently enrolled in any programsEnroll in a MicroMasters Program"
            )
          }
        )
      })
    })

    describe("profile page", () => {
      it("renders errors when there is an error receiving the profile", () => {
        helper.profileGetStub
          .withArgs(SETTINGS.user.username)
          .returns(Promise.reject(ERROR_RESPONSE))

        const actions = [
          REQUEST_GET_USER_PROFILE,
          RECEIVE_GET_USER_PROFILE_FAILURE,
          REQUEST_GET_PROGRAM_ENROLLMENTS,
          RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
          START_PROFILE_EDIT
        ]
        return renderComponent("/profile", actions).then(([, div]) => {
          confirmErrorMessage(
            div,
            `${ERROR_RESPONSE.error_code} ${errorString}`,
            `Additional info: ${ERROR_RESPONSE.user_message}`
          )
        })
      })
    })

    describe("user page", () => {
      it("should show an error for profile GET", () => {
        const fourOhFour = {
          errorStatusCode: 404,
          detail:          "some error messsage"
        }
        helper.profileGetStub
          .withArgs(SETTINGS.user.username)
          .returns(Promise.reject(fourOhFour))
        const userPageActions = [
          REQUEST_GET_USER_PROFILE,
          REQUEST_GET_USER_PROFILE,
          RECEIVE_GET_USER_PROFILE_FAILURE,
          RECEIVE_GET_USER_PROFILE_FAILURE,
          REQUEST_GET_PROGRAM_ENROLLMENTS,
          RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
        ]
        return renderComponent(
          `/learner/${SETTINGS.user.username}`,
          userPageActions
        ).then(([, div]) => {
          confirmErrorMessage(
            div,
            `404 ${errorString}`,
            `Additional info: ${fourOhFour.detail}`
          )
        })
      })

      it("should show an error for profile PATCH", () => {
        patchUserProfileStub.returns(Promise.reject({ errorStatusCode: 500 }))
        const learnerPageActions = [
          REQUEST_GET_PROGRAM_ENROLLMENTS,
          RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
          REQUEST_GET_USER_PROFILE,
          REQUEST_GET_USER_PROFILE,
          RECEIVE_GET_USER_PROFILE_SUCCESS,
          RECEIVE_GET_USER_PROFILE_SUCCESS
        ]
        return renderComponent(
          `/learner/${SETTINGS.user.username}`,
          learnerPageActions
        ).then(([, div]) => {
          const editButton = div
            .querySelector(".card")
            .querySelector(".mdl-button--icon")
          listenForActions(
            [
              SET_LEARNER_PAGE_DIALOG_VISIBILITY,
              START_PROFILE_EDIT,
              UPDATE_PROFILE_VALIDATION,
              REQUEST_PATCH_USER_PROFILE,
              RECEIVE_PATCH_USER_PROFILE_FAILURE,
              CLEAR_PROFILE_EDIT,
              SET_LEARNER_PAGE_DIALOG_VISIBILITY,
              CLEAR_PROFILE_EDIT
            ],
            () => {
              ReactTestUtils.Simulate.click(editButton)
              const dialog = document.querySelector(".personal-dialog")
              const save = dialog.querySelector(".save-button")
              ReactTestUtils.Simulate.click(save)
            }
          ).then(() => {
            confirmErrorMessage(div, `500 ${errorString}`)
          })
        })
      })
    })

    describe("learners page", () => {
      it("shows nothing if there is no matching current program enrollment", () => {
        helper.programsGetStub.returns(Promise.resolve([]))

        return renderComponent("/learners").then(([wrapper]) => {
          const message = wrapper.find(".page-content").text()
          assert.equal(message, "")
        })
      })
    })
  })
})

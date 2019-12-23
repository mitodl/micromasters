/* global SETTINGS:false */
import React from "react"
import { assert } from "chai"
import _ from "lodash"
import ReactTestUtils from "react-dom/test-utils"
import { render } from "enzyme"
import { Provider } from "react-redux"
import sinon from "sinon"

import * as inputUtil from "../components/inputs/util"
import FinancialAidCalculator, {
  CALCULATOR_DIALOG
} from "../containers/FinancialAidCalculator"
import IntegrationTestHelper from "../util/integration_test_helper"
import {
  modifyTextField,
  modifySelectField,
  clearSelectField
} from "../util/test_utils"
import {
  DASHBOARD_RESPONSE,
  FINANCIAL_AID_PARTIAL_RESPONSE,
  PROGRAMS
} from "../test_constants"
import {
  requestAddFinancialAid,
  requestSkipFinancialAid,
  START_CALCULATOR_EDIT,
  UPDATE_CALCULATOR_EDIT,
  CLEAR_CALCULATOR_EDIT,
  UPDATE_CALCULATOR_VALIDATION,
  REQUEST_SKIP_FINANCIAL_AID,
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
  REQUEST_ADD_FINANCIAL_AID,
  RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
  RECEIVE_ADD_FINANCIAL_AID_FAILURE
} from "../actions/financial_aid"
import {
  receiveGetProgramEnrollmentsSuccess,
  setCurrentProgramEnrollment
} from "../actions/programs"
import {
  setConfirmSkipDialogVisibility,
  SHOW_DIALOG,
  HIDE_DIALOG,
  SET_CONFIRM_SKIP_DIALOG_VISIBILITY
} from "../actions/ui"
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS
} from "../actions/dashboard"
import { DASHBOARD_SUCCESS_ACTIONS } from "./test_util"
import { actions } from "../lib/redux_rest"

describe("FinancialAidCalculator", () => {
  let listenForActions, renderComponent, helper
  const financialAidDashboard = _.cloneDeep(DASHBOARD_RESPONSE)
  const program = financialAidDashboard.programs.find(
    program => program.title === "Not passed program"
  )
  program.financial_aid_availability = true
  program.financial_aid_user_info = {
    max_possible_cost: 100,
    min_possible_cost: 50,
    has_user_applied:  false
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listenForActions = helper.listenForActions.bind(helper)
    renderComponent = helper.renderComponent.bind(helper)
    helper.dashboardStub.returns(Promise.resolve(financialAidDashboard))
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should let you open and close the financial aid calculator", () => {
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        wrapper
          .find(".pricing-actions")
          .find(".calculate-cost-button")
          .simulate("click")
        assert.equal(
          helper.store.getState().ui.dialogVisibility[CALCULATOR_DIALOG],
          true
        )
        const calculator = document.querySelector(".financial-aid-calculator")

        ReactTestUtils.Simulate.click(
          calculator.querySelector(".cancel-button")
        )
        assert.equal(
          helper.store.getState().ui.dialogVisibility[CALCULATOR_DIALOG],
          false
        )
      }
    )
  })

  it("should let you skip and pay full price", () => {
    helper.skipFinancialAidStub.returns(
      Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE)
    )
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        return listenForActions(
          [
            START_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            SHOW_DIALOG,
            HIDE_DIALOG,
            CLEAR_CALCULATOR_EDIT,
            SET_CONFIRM_SKIP_DIALOG_VISIBILITY,
            REQUEST_SKIP_FINANCIAL_AID,
            RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
            actions.prices.get.requestType,
            REQUEST_DASHBOARD,
            actions.prices.get.successType,
            RECEIVE_DASHBOARD_SUCCESS,
            SET_CONFIRM_SKIP_DIALOG_VISIBILITY
          ],
          () => {
            wrapper
              .find(".pricing-actions")
              .find(".calculate-cost-button")
              .simulate("click")
            assert.equal(
              helper.store.getState().ui.dialogVisibility[CALCULATOR_DIALOG],
              true
            )
            const calculator = document.querySelector(
              ".financial-aid-calculator-wrapper"
            )
            ReactTestUtils.Simulate.click(
              calculator.querySelector(".full-price")
            )
            const confirmDialog = document.querySelector(
              ".skip-financial-aid-dialog-wrapper"
            )
            ReactTestUtils.Simulate.click(
              confirmDialog.querySelector(".skip-button")
            )
          }
        ).then(() => {
          assert(
            helper.skipFinancialAidStub.calledWith(program.id),
            "should skip with the right program id"
          )
        })
      }
    )
  })

  for (const activity of [true, false]) {
    it(`has proper spinner state for the skip dialog save button for activity=${activity.toString()}`, () => {
      const dialogActionsSpy = helper.sandbox.spy(inputUtil, "dialogActions")
      helper.skipFinancialAidStub.returns(
        Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE)
      )
      helper.store.dispatch(setConfirmSkipDialogVisibility(true))

      if (activity) {
        helper.store.dispatch(requestSkipFinancialAid())
      }
      return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
        () => {
          // assert inFlight arg
          assert.isTrue(
            dialogActionsSpy.calledWith(
              sinon.match.any,
              sinon.match.any,
              activity,
              "Pay Full Price"
            )
          )
        }
      )
    })
  }

  it(`disables the button if fetchAddStatus is in progress`, () => {
    helper.skipFinancialAidStub.returns(
      Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE)
    )
    helper.store.dispatch(setConfirmSkipDialogVisibility(true))
    helper.store.dispatch(requestAddFinancialAid())

    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(() => {
      const confirmDialog = document.querySelector(
        ".skip-financial-aid-dialog-wrapper"
      )
      const skipButton = confirmDialog.querySelector(".skip-button")

      assert.isFalse(skipButton.className.includes("disabled-with-spinner"))
      assert.isTrue(skipButton.disabled)
      assert.equal(skipButton.textContent, "Pay Full Price")
      ReactTestUtils.Simulate.click(skipButton)
      assert.isFalse(helper.skipFinancialAidStub.calledWith(program.id))
    })
  })

  it("should let you enter your income", () => {
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        return listenForActions(
          [
            START_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            SHOW_DIALOG,
            UPDATE_CALCULATOR_VALIDATION,
            UPDATE_CALCULATOR_EDIT
          ],
          () => {
            wrapper
              .find(".pricing-actions")
              .find(".calculate-cost-button")
              .simulate("click")
            modifyTextField(
              document.querySelector("#user-salary-input"),
              "1000"
            )
          }
        ).then(() => {
          assert.deepEqual(helper.store.getState().financialAid, {
            income:          "1000",
            currency:        "USD",
            checkBox:        false,
            fetchAddStatus:  undefined,
            fetchSkipStatus: undefined,
            programId:       program.id,
            validation:      {
              checkBox: "You must agree to these terms"
            },
            fetchError: null
          })
        })
      }
    )
  })

  it("should show validation errors if the user doesnt fill out fields", () => {
    const checkInvalidInput = (selector, reqdAttr) => {
      const calculator = document.querySelector(".financial-aid-calculator")
      const input = calculator.querySelector(selector)
      assert.ok(
        input.attributes.getNamedItem("aria-invalid").value,
        "should be invalid"
      )
      assert.isNotNull(input.attributes.getNamedItem(reqdAttr))
    }

    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        return listenForActions(
          [
            START_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            SHOW_DIALOG,
            UPDATE_CALCULATOR_VALIDATION,
            UPDATE_CALCULATOR_EDIT
          ],
          () => {
            wrapper
              .find(".pricing-actions")
              .find(".calculate-cost-button")
              .simulate("click")
            clearSelectField(document.querySelector(".currency"))
            ReactTestUtils.Simulate.click(
              document.querySelector(".financial-aid-calculator .save-button")
            )
          }
        ).then(() => {
          const state = helper.store.getState().financialAid
          assert.deepEqual(state.validation, {
            checkBox: "You must agree to these terms",
            income:   "Income is required",
            currency: "Please select a currency"
          })
          checkInvalidInput(".salary-field", "aria-required")
          checkInvalidInput(".currency .Select-input input", "aria-required")
          assert.isNotNull(document.querySelector(".checkbox input").required)
        })
      }
    )
  })

  for (const income of ["2000.00", "2000.50", "2Adb", "two thousand"]) {
    it(`should show validation errors if invalid income=${income}`, () => {
      return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
        ([wrapper]) => {
          return listenForActions(
            [
              START_CALCULATOR_EDIT,
              UPDATE_CALCULATOR_EDIT,
              SHOW_DIALOG,
              UPDATE_CALCULATOR_VALIDATION,
              UPDATE_CALCULATOR_EDIT
            ],
            () => {
              wrapper
                .find(".pricing-actions")
                .find(".calculate-cost-button")
                .simulate("click")
              modifyTextField(
                document.querySelector("#user-salary-input"),
                income
              )
            }
          ).then(() => {
            const state = helper.store.getState().financialAid
            assert.equal(
              state.validation["income"],
              "Please only use whole numbers."
            )
          })
        }
      )
    })
  }

  it("should let you enter your preferred currency", () => {
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        return listenForActions(
          [
            START_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            SHOW_DIALOG,
            UPDATE_CALCULATOR_VALIDATION,
            UPDATE_CALCULATOR_EDIT
          ],
          () => {
            wrapper
              .find(".pricing-actions")
              .find(".calculate-cost-button")
              .simulate("click")
            const select = document.querySelector(".currency")
            modifySelectField(select, "GBP")
          }
        ).then(() => {
          assert.deepEqual(helper.store.getState().financialAid, {
            income:          "",
            currency:        "GBP",
            checkBox:        false,
            fetchAddStatus:  undefined,
            fetchSkipStatus: undefined,
            programId:       program.id,
            validation:      {
              checkBox: "You must agree to these terms",
              income:   "Income is required"
            },
            fetchError: null
          })
        })
      }
    )
  })

  it("should let you submit a financial aid request", () => {
    helper.addFinancialAidStub.returns(
      Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE)
    )
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        return listenForActions(
          [
            START_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            SHOW_DIALOG,
            UPDATE_CALCULATOR_VALIDATION,
            UPDATE_CALCULATOR_VALIDATION,
            UPDATE_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            HIDE_DIALOG,
            SHOW_DIALOG,
            REQUEST_ADD_FINANCIAL_AID,
            RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
            actions.prices.get.requestType,
            REQUEST_DASHBOARD,
            actions.prices.get.successType,
            RECEIVE_DASHBOARD_SUCCESS,
            CLEAR_CALCULATOR_EDIT,
            HIDE_DIALOG
          ],
          () => {
            wrapper
              .find(".pricing-actions")
              .find(".calculate-cost-button")
              .simulate("click")
            const calculator = document.querySelector(
              ".financial-aid-calculator"
            )
            ReactTestUtils.Simulate.change(
              calculator.querySelector(".checkbox-income input")
            )
            modifyTextField(
              document.querySelector("#user-salary-input"),
              "1000"
            )
            ReactTestUtils.Simulate.click(
              calculator.querySelector(".save-button")
            )
            const confirmDialog = document.querySelector(".confirm-dialog")
            ReactTestUtils.Simulate.click(
              confirmDialog.querySelector(".save-button")
            )
          }
        ).then(() => {
          assert(
            helper.addFinancialAidStub.calledWith("1000", "USD", program.id),
            "should be called with the right arguments"
          )
        })
      }
    )
  })

  for (const activity of [true, false]) {
    it(`has appropriate state for financial aid submit button, activity=${activity.toString()}`, () => {
      const dialogActionsSpy = helper.sandbox.spy(inputUtil, "dialogActions")

      if (activity) {
        helper.store.dispatch(requestAddFinancialAid())
      }
      helper.addFinancialAidStub.returns(
        Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE)
      )
      return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
        () => {
          assert.isTrue(
            dialogActionsSpy.calledWith(
              sinon.match.any,
              sinon.match.any,
              activity,
              "Submit"
            )
          )
        }
      )
    })
  }

  it(`should be disabled if the skip button is in progress`, () => {
    helper.addFinancialAidStub.returns(
      Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE)
    )
    helper.store.dispatch(requestSkipFinancialAid())

    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS)
      .then(([wrapper]) => {
        wrapper
          .find(".pricing-actions")
          .find(".dashboard-button")
          .simulate("click")
        const calculator = document.querySelector(".financial-aid-calculator")
        ReactTestUtils.Simulate.change(
          calculator.querySelector(".checkbox-income input")
        )
        modifyTextField(document.querySelector("#user-salary-input"), "1000")

        const saveButton = calculator.querySelector(".calculate-cost-button")
        assert.isFalse(saveButton.className.includes("disabled-with-spinner"))
        assert.equal(saveButton.textContent, "Submit")
        assert.isTrue(saveButton.disabled)

        ReactTestUtils.Simulate.click(saveButton)
      })
      .then(() => {
        assert.isFalse(
          helper.addFinancialAidStub.calledWith("1000", "USD", program.id)
        )
      })
  })

  it("should show an error if the financial aid request fails", () => {
    helper.addFinancialAidStub.returns(
      Promise.reject({
        "0":             "an error message",
        errorStatusCode: 500
      })
    )
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        return listenForActions(
          [
            START_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            SHOW_DIALOG,
            UPDATE_CALCULATOR_VALIDATION,
            UPDATE_CALCULATOR_VALIDATION,
            UPDATE_CALCULATOR_EDIT,
            UPDATE_CALCULATOR_EDIT,
            HIDE_DIALOG,
            SHOW_DIALOG,
            REQUEST_ADD_FINANCIAL_AID,
            RECEIVE_ADD_FINANCIAL_AID_FAILURE
          ],
          () => {
            wrapper
              .find(".pricing-actions")
              .find(".calculate-cost-button")
              .simulate("click")
            const calculator = document.querySelector(
              ".financial-aid-calculator"
            )
            ReactTestUtils.Simulate.change(
              calculator.querySelector(".checkbox-income input")
            )
            modifyTextField(
              document.querySelector("#user-salary-input"),
              "1000"
            )
            ReactTestUtils.Simulate.click(
              calculator.querySelector(".calculate-cost-button")
            )
            const confirmDialog = document.querySelector(".confirm-dialog")
            ReactTestUtils.Simulate.click(
              confirmDialog.querySelector(".save-button")
            )
          }
        ).then(() => {
          assert(
            helper.addFinancialAidStub.calledWith("1000", "USD", program.id),
            "should be called with the right arguments"
          )
          assert.equal(
            document.querySelector(".api-error").textContent,
            `There was an error (Error 500: an error message). Please contact ${
              SETTINGS.support_email
            } \
if you continue to have problems.`
          )
          const state = helper.store.getState()
          assert.deepEqual(state.financialAid.fetchError, {
            message: "an error message",
            code:    500
          })
        })
      }
    )
  })

  it("should show nothing if there is no program found", () => {
    helper.store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAMS))
    helper.store.dispatch(
      setCurrentProgramEnrollment({
        id: 123456
      })
    )

    const wrapper = render(
      <Provider store={helper.store}>
        <FinancialAidCalculator
          programs={[]}
          currentProgramEnrollment={{
            id:    3,
            title: "title"
          }}
        />
      </Provider>
    )

    assert.lengthOf(wrapper.find(".financial-aid-calculator"), 0)
  })
})

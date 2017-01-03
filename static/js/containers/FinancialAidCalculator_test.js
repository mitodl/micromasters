/* global SETTINGS:false */
import React from 'react';
import { assert } from 'chai';
import _ from 'lodash';
import TestUtils from 'react-addons-test-utils';
import { render } from 'enzyme';
import { Provider } from 'react-redux';
import sinon from 'sinon';

import * as inputUtil from '../components/inputs/util';
import FinancialAidCalculator from '../containers/FinancialAidCalculator';
import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../lib/api';
import { modifyTextField, modifySelectField, clearSelectField } from '../util/test_utils';
import { DASHBOARD_RESPONSE, FINANCIAL_AID_PARTIAL_RESPONSE } from '../constants';
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
  RECEIVE_ADD_FINANCIAL_AID_FAILURE,
} from '../actions/financial_aid';
import {
  receiveGetProgramEnrollmentsSuccess,
  setCurrentProgramEnrollment,
} from '../actions/programs';
import {
  setConfirmSkipDialogVisibility,
  SET_CALCULATOR_DIALOG_VISIBILITY,
  SET_CONFIRM_SKIP_DIALOG_VISIBILITY,
} from '../actions/ui';
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
} from '../actions/index';
import { DASHBOARD_SUCCESS_ACTIONS } from './test_util';

describe('FinancialAidCalculator', () => {
  let listenForActions, renderComponent, helper, addFinancialAidStub, skipFinancialAidStub;
  let financialAidDashboard = _.cloneDeep(DASHBOARD_RESPONSE);
  let program = financialAidDashboard.find(program => (
    program.title === "Not passed program"
  ));
  program.financial_aid_availability = true;
  program.financial_aid_user_info = {
    max_possible_cost: 100,
    min_possible_cost: 50,
  };

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    listenForActions = helper.listenForActions.bind(helper);
    renderComponent = helper.renderComponent.bind(helper);
    addFinancialAidStub = helper.sandbox.stub(api, 'addFinancialAid');
    skipFinancialAidStub = helper.sandbox.stub(api, 'skipFinancialAid');
    helper.dashboardStub.returns(Promise.resolve(financialAidDashboard));
  });

  afterEach(() => {
    helper.cleanup();
  });

  it('should let you open and close the financial aid calculator', () => {
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      wrapper.find('.pricing-actions').find('.calculate-cost-button').simulate('click');
      assert.equal(helper.store.getState().ui.calculatorDialogVisibility, true);
      let calculator = document.querySelector('.financial-aid-calculator');

      TestUtils.Simulate.click(calculator.querySelector('.cancel-button'));
      assert.equal(helper.store.getState().ui.calculatorDialogVisibility, false);
    });
  });

  it('should let you skip and pay full price', () => {
    skipFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        CLEAR_CALCULATOR_EDIT,
        SET_CONFIRM_SKIP_DIALOG_VISIBILITY,
        REQUEST_SKIP_FINANCIAL_AID,
        RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
        REQUEST_COURSE_PRICES,
        REQUEST_DASHBOARD,
        RECEIVE_COURSE_PRICES_SUCCESS,
        RECEIVE_DASHBOARD_SUCCESS,
        SET_CONFIRM_SKIP_DIALOG_VISIBILITY,
      ], () => {
        wrapper.find('.pricing-actions').find('.calculate-cost-button').simulate('click');
        assert.equal(helper.store.getState().ui.calculatorDialogVisibility, true);
        let calculator = document.querySelector('.financial-aid-calculator-wrapper');
        TestUtils.Simulate.click(calculator.querySelector('.full-price'));
        let confirmDialog = document.querySelector('.skip-financial-aid-dialog-wrapper');
        TestUtils.Simulate.click(confirmDialog.querySelector('.skip-button'));
      }).then(() => {
        assert(
          skipFinancialAidStub.calledWith(program.id),
          'should skip with the right program id'
        );
      });
    });
  });

  for (let activity of [true, false]) {
    it(`has proper spinner state for the skip dialog save button for activity=${activity.toString()}`, () => {
      let dialogActionsSpy = helper.sandbox.spy(inputUtil, 'dialogActions');
      skipFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
      helper.store.dispatch(setConfirmSkipDialogVisibility(true));

      if (activity) {
        helper.store.dispatch(requestSkipFinancialAid());
      }
      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(() => {
        // assert inFlight arg
        assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, activity, "Pay Full Price"));
      });
    });
  }

  it(`disables the button if fetchAddStatus is in progress`, () => {
    skipFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
    helper.store.dispatch(setConfirmSkipDialogVisibility(true));
    helper.store.dispatch(requestAddFinancialAid());

    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(() => {
      let confirmDialog = document.querySelector('.skip-financial-aid-dialog-wrapper');
      let skipButton = confirmDialog.querySelector('.skip-button');

      assert.isFalse(skipButton.className.includes('disabled-with-spinner'));
      assert.isTrue(skipButton.disabled);
      assert.equal(skipButton.innerHTML, 'Pay Full Price');
      TestUtils.Simulate.click(skipButton);
      assert.isFalse(skipFinancialAidStub.calledWith(program.id));
    });
  });

  it('should let you enter your income', () => {
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        UPDATE_CALCULATOR_VALIDATION,
        UPDATE_CALCULATOR_EDIT
      ], () => {
        wrapper.find('.pricing-actions').find('.calculate-cost-button').simulate('click');
        modifyTextField(document.querySelector('#user-salary-input'), '1000');
      }).then(() => {
        assert.deepEqual(helper.store.getState().financialAid, {
          income: '1000',
          currency: 'USD',
          checkBox: false,
          fetchAddStatus: undefined,
          fetchSkipStatus: undefined,
          programId: program.id,
          validation: {
            'checkBox': 'You must agree to these terms'
          },
          fetchError: null,
        });
      });
    });
  });

  it('should show validation errors if the user doesnt fill out fields', () => {
    const checkInvalidInput = (selector, reqdAttr) => {
      let calculator = document.querySelector('.financial-aid-calculator');
      let input = calculator.querySelector(selector);
      assert.ok(input.attributes.getNamedItem('aria-invalid').value, 'should be invalid');
      assert.isNotNull(input.attributes.getNamedItem(reqdAttr));
    };

    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        UPDATE_CALCULATOR_VALIDATION,
        UPDATE_CALCULATOR_EDIT,
      ], () => {
        wrapper.find('.pricing-actions').find('.calculate-cost-button').simulate('click');
        clearSelectField(document.querySelector('.currency'));
        TestUtils.Simulate.click(document.querySelector('.financial-aid-calculator .save-button'));
      }).then(() => {
        let state = helper.store.getState().financialAid;
        assert.deepEqual(state.validation, {
          'checkBox': 'You must agree to these terms',
          'income': 'Income is required',
          'currency': 'Please select a currency'
        });
        checkInvalidInput('.salary-field input', 'aria-required');
        checkInvalidInput('.checkbox input', 'required');
        checkInvalidInput('.currency .Select-input input', 'aria-required');
      });
    });
  });

  it('should let you enter your preferred currency', () => {
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        UPDATE_CALCULATOR_VALIDATION,
        UPDATE_CALCULATOR_EDIT,
      ], () => {
        wrapper.find('.pricing-actions').find('.calculate-cost-button').simulate('click');
        let select = document.querySelector('.currency');
        modifySelectField(select, 'GBP');
      }).then(() => {
        assert.deepEqual(helper.store.getState().financialAid, {
          income: '',
          currency: 'GBP',
          checkBox: false,
          fetchAddStatus: undefined,
          fetchSkipStatus: undefined,
          programId: program.id,
          validation: {
            'checkBox': 'You must agree to these terms',
            'income': 'Income is required'
          },
          fetchError: null,
        });
      });
    });
  });

  it('should let you submit a financial aid request', () => {
    addFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        UPDATE_CALCULATOR_VALIDATION,
        UPDATE_CALCULATOR_VALIDATION,
        UPDATE_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        REQUEST_ADD_FINANCIAL_AID,
        RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
        REQUEST_COURSE_PRICES,
        REQUEST_DASHBOARD,
        RECEIVE_COURSE_PRICES_SUCCESS,
        RECEIVE_DASHBOARD_SUCCESS,
        CLEAR_CALCULATOR_EDIT,
      ], () => {
        wrapper.find('.pricing-actions').find('.calculate-cost-button').simulate('click');
        let calculator = document.querySelector('.financial-aid-calculator');
        TestUtils.Simulate.change(calculator.querySelector('.mdl-checkbox__input'));
        modifyTextField(document.querySelector('#user-salary-input'), '1000');
        TestUtils.Simulate.click(calculator.querySelector('.save-button'));
      }).then(() => {
        assert(
          addFinancialAidStub.calledWith('1000', 'USD', program.id),
          'should be called with the right arguments'
        );
      });
    });
  });

  for (let activity of [true, false]) {
    it(`has appropriate state for financial aid submit button, activity=${activity.toString()}`, () => {
      let dialogActionsSpy = helper.sandbox.spy(inputUtil, 'dialogActions');

      if (activity) {
        helper.store.dispatch(requestAddFinancialAid());
      }
      addFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
      return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(() => {
        assert.isTrue(dialogActionsSpy.calledWith(sinon.match.any, sinon.match.any, activity, "Calculate"));
      });
    });
  }

  it(`should be disabled if the skip button is in progress`, () => {
    addFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
    helper.store.dispatch(requestSkipFinancialAid());

    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      wrapper.find('.pricing-actions').find('.dashboard-button').simulate('click');
      let calculator = document.querySelector('.financial-aid-calculator');
      TestUtils.Simulate.change(calculator.querySelector('.mdl-checkbox__input'));
      modifyTextField(document.querySelector('#user-salary-input'), '1000');

      let saveButton = calculator.querySelector('.save-button');
      assert.isFalse(saveButton.className.includes('disabled-with-spinner'));
      assert.equal(saveButton.innerHTML, 'Calculate');
      assert.isTrue(saveButton.disabled);

      TestUtils.Simulate.click(saveButton);
    }).then(() => {
      assert.isFalse(addFinancialAidStub.calledWith('1000', 'USD', program.id));
    });
  });

  it('should show an error if the financial aid request fails', () => {
    addFinancialAidStub.returns(Promise.reject({
      '0': 'an error message',
      errorStatusCode: 500
    }));
    return renderComponent('/dashboard', DASHBOARD_SUCCESS_ACTIONS).then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        UPDATE_CALCULATOR_VALIDATION,
        UPDATE_CALCULATOR_VALIDATION,
        UPDATE_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        REQUEST_ADD_FINANCIAL_AID,
        RECEIVE_ADD_FINANCIAL_AID_FAILURE,
      ], () => {
        wrapper.find('.pricing-actions').find('.calculate-cost-button').simulate('click');
        let calculator = document.querySelector('.financial-aid-calculator');
        TestUtils.Simulate.change(calculator.querySelector('.mdl-checkbox__input'));
        modifyTextField(document.querySelector('#user-salary-input'), '1000');
        TestUtils.Simulate.click(calculator.querySelector('.save-button'));
      }).then(() => {
        assert(
          addFinancialAidStub.calledWith('1000', 'USD', program.id),
          'should be called with the right arguments'
        );
        assert.equal(
          document.querySelector('.api-error').textContent,
          `There was an error (Error 500: an error message). Please contact ${SETTINGS.support_email} \
if you continue to have problems.`
        );
        let state = helper.store.getState();
        assert.deepEqual(state.financialAid.fetchError, {
          message: 'an error message', code: 500
        });
      });
    });
  });

  it('should show nothing if there is no program found', () => {
    helper.store.dispatch(receiveGetProgramEnrollmentsSuccess(DASHBOARD_RESPONSE));
    helper.store.dispatch(setCurrentProgramEnrollment({
      id: 123456
    }));

    let wrapper = render(
      <Provider store={helper.store}>
        <FinancialAidCalculator
          programs={[]}
          currentProgramEnrollment={{
            id: 3,
            title: 'title'
          }}
        />
      </Provider>
    );

    assert.lengthOf(wrapper.find(".financial-aid-calculator"), 0);
  });
});

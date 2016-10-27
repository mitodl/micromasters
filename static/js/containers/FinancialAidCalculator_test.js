import { assert } from 'chai';
import _ from 'lodash';
import TestUtils from 'react-addons-test-utils';

import IntegrationTestHelper from '../util/integration_test_helper';
import * as api from '../lib/api';
import { modifyTextField } from '../util/test_utils';
import { DASHBOARD_RESPONSE, FINANCIAL_AID_PARTIAL_RESPONSE } from '../constants';
import {
  START_CALCULATOR_EDIT,
  UPDATE_CALCULATOR_EDIT,
  CLEAR_CALCULATOR_EDIT,
  REQUEST_SKIP_FINANCIAL_AID,
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
  REQUEST_ADD_FINANCIAL_AID,
  RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
} from '../actions/financial_aid';
import {
  SET_CALCULATOR_DIALOG_VISIBILITY,
  SET_CONFIRM_SKIP_DIALOG_VISIBILITY,
} from '../actions/ui';
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
} from '../actions/index';

describe('FinancialAidCalculator', () => {
  let listenForActions, renderComponent, helper, addFinancialAidStub, skipFinancialAidStub;

  let financialAidDashboard = _.clone(DASHBOARD_RESPONSE);
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
    return renderComponent('/dashboard').then(([wrapper]) => {
      wrapper.find('.pricing-actions').find('.dashboard-button').simulate('click');
      assert.equal(helper.store.getState().ui.calculatorDialogVisibility, true);
      let calculator = document.querySelector('.financial-aid-calculator');

      TestUtils.Simulate.click(calculator.querySelector('.cancel-button'));
      assert.equal(helper.store.getState().ui.calculatorDialogVisibility, false);
    });
  });

  it('should let you skip and pay full price', () => {
    skipFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
    return renderComponent('/dashboard').then(([wrapper]) => {
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
        wrapper.find('.pricing-actions').find('.dashboard-button').simulate('click');
        assert.equal(helper.store.getState().ui.calculatorDialogVisibility, true);
        let calculator = document.querySelector('.financial-aid-calculator-wrapper');
        TestUtils.Simulate.click(calculator.querySelector('.full-price'));
        let confirmDialog = document.querySelector('.skip-financial-aid-dialog-wrapper');
        TestUtils.Simulate.click(confirmDialog.querySelector('.save-button'));
      }).then(() => {
        assert(
          skipFinancialAidStub.calledWith(program.id),
          'should skip with the right program id'
        );
      });
    });
  });

  it('should let you enter your income', () => {
    return renderComponent('/dashboard').then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        UPDATE_CALCULATOR_EDIT
      ], () => {
        wrapper.find('.pricing-actions').find('.dashboard-button').simulate('click');
        modifyTextField(document.querySelector('#user-salary-input'), '1000');
      }).then(() => {
        assert.deepEqual(helper.store.getState().financialAid, {
          income: '1000',
          currency: 'USD',
          checkBox: false,
          fetchStatus: null,
          programId: program.id,
          validation: {}
        });
      });
    });
  });

  it('should let you enter your preferred currency', () => {
    return renderComponent('/dashboard').then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
        UPDATE_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
      ], () => {
        wrapper.find('.pricing-actions').find('.dashboard-button').simulate('click');
        modifyTextField(document.querySelector('#currency-select'), 'Pound sterling');
      }).then(() => {
        assert.deepEqual(helper.store.getState().financialAid, {
          income: '',
          currency: 'GBP',
          currency_edit: undefined,
          checkBox: false,
          fetchStatus: null,
          programId: program.id,
          validation: {}
        });
      });
    });
  });

  it('should let you submit a financial aid request', () => {
    addFinancialAidStub.returns(Promise.resolve(FINANCIAL_AID_PARTIAL_RESPONSE));
    return renderComponent('/dashboard').then(([wrapper]) => {
      return listenForActions([
        START_CALCULATOR_EDIT,
        UPDATE_CALCULATOR_EDIT,
        SET_CALCULATOR_DIALOG_VISIBILITY,
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
        wrapper.find('.pricing-actions').find('.dashboard-button').simulate('click');
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
});


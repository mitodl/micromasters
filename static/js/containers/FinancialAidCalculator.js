/* global SETTINGS:false */
import React from 'react';
import Dialog from 'material-ui/Dialog';
import { connect } from 'react-redux';
import R from 'ramda';
import TextField from 'material-ui/TextField';
import Checkbox from 'react-mdl/lib/Checkbox';
import Select from 'react-select';
import _ from 'lodash';

import { FETCH_PROCESSING } from '../actions';
import {
  updateCalculatorEdit,
  clearCalculatorEdit,
  addFinancialAid,
  updateCalculatorValidation,
} from '../actions/financial_aid';
import {
  setCalculatorDialogVisibility,
  setConfirmSkipDialogVisibility,
} from '../actions/ui';
import { createSimpleActionHelpers } from '../lib/redux';
import { currencyOptions } from '../lib/currency';
import { validateFinancialAid } from '../lib/validation/profile';
import { sanitizeNumberString } from '../lib/validation/date';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import type {
  FinancialAidState,
  FinancialAidValidation,
  FetchError,
} from '../reducers/financial_aid';
import type { Program } from '../flow/programTypes';
import { formatPrice } from '../util/util';
import { dialogActions } from '../components/inputs/util';

const updateCurrency = R.curry((update, financialAid, selection) => {
  let _financialAid = R.clone(financialAid);
  _financialAid.currency = selection ? selection.value : null;
  update(_financialAid);
});

const currencySelect = (update, current) => (
  <Select
    options={currencyOptions}
    clearable={false}
    value={current.currency}
    onChange={updateCurrency(update, current)}
    name="currency"
    id="currency-select"
    inputProps={{
      'aria-required': "true",
      'aria-invalid': _.has(current, ['validation', 'currency'])
    }}
  />
);

const salaryUpdate = R.curry((update, current, e) => {
  let newEdit = R.clone(current);
  newEdit.income = sanitizeNumberString(20, e.target.value);
  update(newEdit);
});

const salaryField = (update, current) => (
  <TextField
    name="salary"
    aria-required="true"
    aria-invalid={_.has(current, ['validation', 'income'])}
    label="income (yearly)"
    id="user-salary-input"
    className="salary-field"
    value={current.income}
    fullWidth={true}
    onChange={salaryUpdate(update, current)}
  />
);

const checkboxText = `I testify that the income I reported is true and accurate.
I am aware that I may be asked to verify the reported income with documentation.`;

const checkboxUpdate = (update, current, bool) => {
  let newEdit = R.clone(current);
  newEdit.checkBox = bool;
  update(newEdit);
};

const checkBox = (update, current) => (
  <Checkbox
    checked={current.checkBox}
    required="true"
    aria-invalid={_.has(current, ['validation', 'checkBox'])}
    label={checkboxText}
    onChange={() => checkboxUpdate(update, current, !current.checkBox)}
  />
);

const calculatorActions = (openSkipDialog, cancel, save, fetchAddStatus) => {
  return <div className="actions">
    <button className="mm-minor-action full-price" onClick={openSkipDialog}>
      Skip this and Pay Full Price
    </button>
    <div className="buttons">
      { dialogActions(cancel, save, fetchAddStatus === FETCH_PROCESSING, 'Calculate', 'calculate-cost-button') }
    </div>
  </div>;
};

const validationMessage = (key, errors) => {
  if ( errors === undefined || R.isNil(errors[key]) ) {
    return null;
  }
  return <div className="validation-message">
    { errors[key] }
  </div>;
};

const apiError = ({ message, code }: FetchError) => (
  <div className="api-error">
    {`There was an error (Error ${code}: ${message}). Please contact `}
    <a href={`mailto:${SETTINGS.support_email}`}>
      {`${SETTINGS.support_email}`}
    </a>
    {" if you continue to have problems."}
  </div>
);

type CalculatorProps = {
  calculatorDialogVisibility: boolean,
  closeDialogAndCancel:       () => void,
  financialAid:               FinancialAidState,
  validation:                 FinancialAidValidation,
  saveFinancialAid:           (f: FinancialAidState) => void,
  updateCalculatorEdit:       (f: FinancialAidState) => void,
  currentProgramEnrollment:   AvailableProgram,
  openConfirmSkipDialog:      () => void,
  programs:                   Array<Program>,
};

const FinancialAidCalculator = ({
  calculatorDialogVisibility,
  closeDialogAndCancel,
  financialAid,
  financialAid: { validation, fetchError, fetchAddStatus },
  saveFinancialAid,
  updateCalculatorEdit,
  currentProgramEnrollment: { title, id },
  openConfirmSkipDialog,
  programs,
}: CalculatorProps) => {
  let program = programs.find(prog => prog.id === id);
  if (!program) {
    return null;
  }

  let minPossibleCost, maxPossibleCost;
  if ( program.financial_aid_availability ) {
    minPossibleCost = formatPrice(program.financial_aid_user_info.min_possible_cost),
    maxPossibleCost = formatPrice(program.financial_aid_user_info.max_possible_cost);
  }
  return <Dialog
    title="Cost Calculator"
    titleClassName="dialog-title"
    contentClassName="dialog financial-aid-calculator"
    className="financial-aid-calculator-wrapper"
    open={calculatorDialogVisibility}
    bodyClassName="financial-aid-calculator-body"
    autoScrollBodyContent={true}
    onRequestClose={closeDialogAndCancel}
    actions={calculatorActions(
      openConfirmSkipDialog, closeDialogAndCancel, () => saveFinancialAid(financialAid), fetchAddStatus
    )}
  >
    <div className="copy">
      { `The cost of courses in the ${title} MicroMasters varies between ${minPossibleCost} and ${maxPossibleCost},
      depending on your income and ability to pay.`}
    </div>
    <div className="salary-input">
      <div className="income">
        <label>
          Income (yearly)
          { salaryField(updateCalculatorEdit, financialAid) }
        </label>
        { validationMessage('income', validation) }
      </div>
      <div className="currency">
        <div>
          Currency
        </div>
        { currencySelect(updateCalculatorEdit, financialAid) }
        { validationMessage('currency', validation) }
      </div>
    </div>
    <div className="checkbox">
      { checkBox(updateCalculatorEdit, financialAid) }
    </div>
    <div className="checkbox-alert">
      { validationMessage('checkBox', validation) }
    </div>
    { fetchError ? apiError(fetchError) : null }
  </Dialog>;
};

const closeDialogAndCancel = dispatch => (
  () => {
    dispatch(setCalculatorDialogVisibility(false));
    dispatch(clearCalculatorEdit());
  }
);

const updateFinancialAidValidation = (dispatch, current) => {
  let errors = validateFinancialAid(current);
  if ( ! R.equals(errors, current.validation) ) {
    dispatch(updateCalculatorValidation(errors));
  }
  return R.isEmpty(errors);
};

const saveFinancialAid = R.curry((dispatch, current) => {
  const { income, currency, programId } = current;
  let valid = updateFinancialAidValidation(dispatch, current);
  let clone = _.cloneDeep(current);
  delete clone.validation;
  if (valid) {
    dispatch(addFinancialAid(income, currency, programId)).then(() => {
      dispatch(clearCalculatorEdit());
      dispatch(setCalculatorDialogVisibility(false));
    });
  }
});

const updateFinancialAidEdit = R.curry((dispatch, current) => {
  updateFinancialAidValidation(dispatch, current);
  let clone = _.cloneDeep(current);
  delete clone.validation;
  dispatch(updateCalculatorEdit(clone));
});

const openConfirmSkipDialogHelper = dispatch => () => {
  closeDialogAndCancel(dispatch)();
  dispatch(setConfirmSkipDialogVisibility(true));
};

const mapStateToProps = state => {
  const {
    ui: { calculatorDialogVisibility },
    financialAid,
    currentProgramEnrollment,
    dashboard: { programs },
  } = state;

  return {
    calculatorDialogVisibility,
    financialAid,
    currentProgramEnrollment,
    programs,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    closeDialogAndCancel: closeDialogAndCancel(dispatch),
    saveFinancialAid: saveFinancialAid(dispatch),
    openConfirmSkipDialog: openConfirmSkipDialogHelper(dispatch),
    updateCalculatorEdit: updateFinancialAidEdit(dispatch),
    ...createSimpleActionHelpers(dispatch, [
      ['clearCalculatorEdit', clearCalculatorEdit],
    ]),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FinancialAidCalculator);

import React from 'react';
import Dialog from 'material-ui/Dialog';
import { connect } from 'react-redux';
import R from 'ramda';
import Button from 'react-mdl/lib/Button';
import TextField from 'material-ui/TextField';
import Checkbox from 'react-mdl/lib/Checkbox';

import {
  updateCalculatorEdit,
  clearCalculatorEdit,
  addFinancialAid,
  updateCalculatorValidation,
} from '../actions/financial_aid';
import { setCalculatorDialogVisibility } from '../actions/ui';
import {
  fetchCoursePrices,
  fetchDashboard,
} from '../actions';
import { createSimpleActionHelpers } from '../util/redux';
import SelectField from '../components/inputs/SelectField';
import { currencyOptions } from '../util/currency';
import {
  validateFinancialAid,
  sanitizeNumberString
} from '../util/validation';
import type { ProgramEnrollment } from '../flow/enrollmentTypes';
import type {
  FinancialAidState,
  FinancialAidValidation,
} from '../reducers/financial_aid';

const currencySelect = (update, current) => (
  <SelectField
    options={currencyOptions}
    keySet={['currency']}
    profile={current}
    onChange={update}
    updateProfile={update}
    name="currency"
    id="currency-select"
  />
);

const salaryUpdate = R.curry((update, current, e) => {
  let newEdit = R.clone(current);
  newEdit.income = sanitizeNumberString(e.target.value, 20);
  update(newEdit);
});

const salaryField = (update, current) => (
  <TextField
    name="salary"
    id="user-salary-input"
    className="salary-field"
    value={current.income}
    fullWidth={true}
    onChange={salaryUpdate(update, current)}
  />
);

const checkboxText = `I testify that the income I reported is true and accurate.
I am aware that I may be asked to verify my income with documentation.`;

const checkboxUpdate = (update, current, bool) => {
  let newEdit = R.clone(current);
  newEdit.checkBox = bool;
  update(newEdit);
};

const checkBox = (update, current) => (
  <Checkbox
    checked={current.checkBox}
    label={checkboxText}
    onChange={() => checkboxUpdate(update, current, !current.checkBox)}
  />
);

const actionButtons = R.map(({ name, onClick, label}) => (
  <Button
    type='button'
    className={`${name}-button mm-button`}
    key={name}
    onClick={onClick}>
    { label }
  </Button>
));

const calculatorActions = (cancel, save) => {
  const buttonManifest = [
    { name: 'cancel', onClick: cancel, label: 'Cancel' },
    { name: 'main-action save', onClick: save, label: 'Calculate' },
  ];

  return <div className="actions">
    <a className="full-price">
      Skip this and Pay Full Price
    </a>
    <div className="buttons">
      { actionButtons(buttonManifest) }
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

type CalculatorProps = {
  calculatorDialogVisibility: boolean,
  closeDialogAndCancel:       () => void,
  financialAid:               FinancialAidState,
  validation:                 FinancialAidValidation,
  saveFinancialAid:           (f: FinancialAidState) => void,
  updateCalculatorEdit:       (f: FinancialAidState) => void,
  currentProgramEnrollment:   ProgramEnrollment,
};

const FinancialAidCalculator = ({
  calculatorDialogVisibility,
  closeDialogAndCancel,
  financialAid,
  financialAid: { validation },
  saveFinancialAid,
  updateCalculatorEdit,
  currentProgramEnrollment: { title },
}: CalculatorProps) => (
  <Dialog
    open={calculatorDialogVisibility}
    contentClassName="financial-aid-calculator"
    bodyClassName="financial-aid-calculator-body"
    onRequestClose={closeDialogAndCancel}
    autoScrollBodyContent={true}
    actions={calculatorActions(closeDialogAndCancel, () => saveFinancialAid(financialAid))}
    title="Cost Calculator"
  >
    <div className="copy">
      { `The cost of courses in the ${title} Micromasters varies between $50 and $1000,
      based on your income and ability to pay.`}
    </div>
    <div className="salary-input">
      <div className="income">
        <div>
          Income (yearly)
        </div>
        { salaryField(updateCalculatorEdit, financialAid) }
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
  </Dialog>
);

const closeDialogAndCancel = dispatch => (
  () => {
    dispatch(setCalculatorDialogVisibility(false));
    dispatch(clearCalculatorEdit());
  }
);

const saveFinancialAid = R.curry((dispatch, current) => {
  const { income, currency, programId } = current;
  let errors = validateFinancialAid(current);
  if ( ! R.isEmpty(errors) ) {
    dispatch(updateCalculatorValidation(errors));
  } else {
    dispatch(addFinancialAid(income, currency, programId)).then(() => {
      dispatch(clearCalculatorEdit());
      dispatch(setCalculatorDialogVisibility(false));

      // refresh dashboard and prices to get the updated financial aid state
      dispatch(fetchCoursePrices());
      dispatch(fetchDashboard());
    });
  }
});

const mapStateToProps = state => {
  const {
    ui: { calculatorDialogVisibility },
    financialAid,
    currentProgramEnrollment,
  } = state;

  return {
    calculatorDialogVisibility,
    financialAid,
    currentProgramEnrollment,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    closeDialogAndCancel: closeDialogAndCancel(dispatch),
    saveFinancialAid: saveFinancialAid(dispatch),
    ...createSimpleActionHelpers(dispatch, [
      ['clearCalculatorEdit', clearCalculatorEdit],
      ['updateCalculatorEdit', updateCalculatorEdit],
    ]),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FinancialAidCalculator);

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
  skipFinancialAid,
} from '../actions/financial_aid';
import {
  setCalculatorDialogVisibility,
  setConfirmSkipDialogVisibility,
} from '../actions/ui';
import { createSimpleActionHelpers } from '../lib/redux';
import SelectField from '../components/inputs/SelectField';
import { currencyOptions } from '../lib/currency';
import { validateFinancialAid } from '../lib/validation/profile';
import { sanitizeNumberString } from '../lib/validation/date';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import type {
  FinancialAidState,
  FinancialAidValidation,
} from '../reducers/financial_aid';
import type { Program } from '../flow/programTypes';
import { formatPrice } from '../util/util';

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
  newEdit.income = sanitizeNumberString(20, e.target.value);
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
I am aware that I may be asked to verify the reported income with documentation.`;

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
const calculatorActions = (openSkipDialog, cancel, save) => {
  const buttonManifest = [
    { name: 'cancel', onClick: cancel, label: 'Cancel' },
    { name: 'main-action save', onClick: save, label: 'Calculate' },
  ];

  return <div className="actions">
    <a className="full-price" onClick={openSkipDialog}>
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
  currentProgramEnrollment:   AvailableProgram,
  openConfirmSkipDialog:      () => void,
  programs:                   Array<Program>,
};

const FinancialAidCalculator = ({
  calculatorDialogVisibility,
  closeDialogAndCancel,
  financialAid,
  financialAid: { validation },
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
    onRequestClose={closeDialogAndCancel}
    autoScrollBodyContent={true}
    actions={calculatorActions(openConfirmSkipDialog, closeDialogAndCancel, () => saveFinancialAid(financialAid))}
  >
    <div className="copy">
      { `The cost of courses in the ${title} MicroMasters varies between ${minPossibleCost} and ${maxPossibleCost},
      depending on your income and ability to pay.`}
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
  </Dialog>;
};

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
    });
  }
});

const skipFinancialAidHelper = R.curry((dispatch, programId) => () => {
  dispatch(skipFinancialAid(programId)).then(() => {
    dispatch(clearCalculatorEdit());
    dispatch(setCalculatorDialogVisibility(false));
  });
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
    skipFinancialAid: skipFinancialAidHelper(dispatch),
    openConfirmSkipDialog: openConfirmSkipDialogHelper(dispatch),
    ...createSimpleActionHelpers(dispatch, [
      ['clearCalculatorEdit', clearCalculatorEdit],
      ['updateCalculatorEdit', updateCalculatorEdit],
    ]),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FinancialAidCalculator);

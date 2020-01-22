/* global SETTINGS:false */
import React from "react"
import Dialog from "@material-ui/core/Dialog"
import { connect } from "react-redux"
import R from "ramda"
import TextField from "@material-ui/core/TextField"
import Checkbox from "@material-ui/core/Checkbox"
import Select from "react-select"
import _ from "lodash"

import { FETCH_PROCESSING } from "../actions"
import {
  updateCalculatorEdit,
  clearCalculatorEdit,
  addFinancialAid,
  updateCalculatorValidation
} from "../actions/financial_aid"
import {
  setConfirmSkipDialogVisibility,
  showDialog,
  hideDialog
} from "../actions/ui"
import { createSimpleActionHelpers } from "../lib/redux"
import { currencyOptions } from "../lib/currency"
import { validateFinancialAid } from "../lib/validation/profile"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import type {
  FinancialAidState,
  FinancialAidValidation,
  FetchError
} from "../reducers/financial_aid"
import type { Program } from "../flow/programTypes"
import { formatPrice } from "../util/util"
import { dialogActions } from "../components/inputs/util"
import { getOwnDashboard } from "../reducers/util"
import DialogActions from "@material-ui/core/DialogActions"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import FormControlLabel from "@material-ui/core/FormControlLabel"

export const CALCULATOR_DIALOG = "CALCULATOR_DIALOG"

export const INCOME_DIALOG = "INCOME_DIALOG"

const updateCurrency = R.curry((update, financialAid, selection) => {
  const _financialAid = R.clone(financialAid)
  _financialAid.currency = selection ? selection.value : null
  update(_financialAid)
})

const currencySelect = (update, current) => (
  <Select
    options={currencyOptions}
    clearable={false}
    value={current.currency}
    onChange={updateCurrency(update, current)}
    name="currency"
    id="currency-select"
    inputProps={{
      "aria-required": "true",
      "aria-invalid":  _.has(current, ["validation", "currency"])
    }}
  />
)

const salaryUpdate = R.curry((update, current, e) => {
  const newEdit = R.clone(current)
  newEdit.income = e.target.value
  update(newEdit)
})

const salaryField = (update, current) => (
  <TextField
    name="salary"
    aria-required="true"
    aria-invalid={_.has(current, ["validation", "income"])}
    id="user-salary-input"
    className="salary-field"
    value={current.income}
    fullWidth={true}
    onChange={salaryUpdate(update, current)}
  />
)

const checkboxText = `I testify that the income I reported is true and accurate.
I am aware that I may be asked to verify the reported income with documentation.`

const checkboxUpdate = (update, current, bool) => {
  const newEdit = R.clone(current)
  newEdit.checkBox = bool
  update(newEdit)
}

const checkBox = (update, current) => (
  <FormControlLabel
    classes={{ label: "testify-income-text" }}
    control={
      <Checkbox
        classes={{ root: "checkbox-income" }}
        checked={current.checkBox}
        required={true}
        onChange={() => checkboxUpdate(update, current, !current.checkBox)}
      />
    }
    label={checkboxText}
  />
)

const calculatorActions = (
  openSkipDialog,
  cancel,
  save,
  fetchAddStatus,
  fetchSkipStatus
) => {
  return (
    <div className="actions">
      <button className="mm-minor-action full-price" onClick={openSkipDialog}>
        Skip this and Pay Full Price
      </button>
      <div className="buttons">
        {dialogActions(
          cancel,
          save,
          fetchAddStatus === FETCH_PROCESSING,
          "Submit",
          "calculate-cost-button",
          fetchSkipStatus === FETCH_PROCESSING
        )}
      </div>
    </div>
  )
}

const validationMessage = (key, errors) => {
  if (errors === undefined || R.isNil(errors[key])) {
    return null
  }
  return <div className="validation-message">{errors[key]}</div>
}

const apiError = ({ message, code }: FetchError) => (
  <div className="api-error">
    {`There was an error (Error ${code}: ${message}). Please contact `}
    <a href={`mailto:${SETTINGS.support_email}`}>
      {`${SETTINGS.support_email}`}
    </a>
    {" if you continue to have problems."}
  </div>
)

type CalculatorProps = {
  calculatorDialogVisibility: boolean,
  confirmIncomeDialogVisibility: boolean,
  closeDialogAndCancel: () => void,
  closeConfirmDialogAndCancel: () => void,
  financialAid: FinancialAidState,
  validation: FinancialAidValidation,
  saveFinancialAid: (f: FinancialAidState) => void,
  submitFinancialAid: (f: FinancialAidState) => void,
  updateCalculatorEdit: (f: FinancialAidState) => void,
  currentProgramEnrollment: AvailableProgram,
  openConfirmSkipDialog: () => void,
  programs: Array<Program>
}

const FinancialAidCalculator = ({
  calculatorDialogVisibility,
  confirmIncomeDialogVisibility,
  closeDialogAndCancel,
  closeConfirmDialogAndCancel,
  financialAid,
  financialAid: {
    validation,
    fetchError,
    income,
    currency,
    fetchAddStatus,
    fetchSkipStatus
  },
  saveFinancialAid,
  submitFinancialAid,
  updateCalculatorEdit,
  currentProgramEnrollment,
  openConfirmSkipDialog,
  programs
  }: CalculatorProps) => {
  if (!currentProgramEnrollment) {
    return null
  }
  const { title, id } = currentProgramEnrollment

  const program = programs.find(prog => prog.id === id)
  if (!program) {
    return null
  }

  let minPossibleCost, maxPossibleCost
  if (program.financial_aid_availability) {
    minPossibleCost = formatPrice(
      program.financial_aid_user_info.min_possible_cost
    )
    maxPossibleCost = formatPrice(
      program.financial_aid_user_info.max_possible_cost
    )
  }
  const confirmDialog = (
    <Dialog
      key="confirm"
      classes={{
        paper: "dialog confirm-dialog",
        root:  "financial-aid-calculator-wrapper"
      }}
      open={confirmIncomeDialogVisibility}
      onClose={closeConfirmDialogAndCancel}
    >
      <DialogTitle className="dialog-title">Confirm Your Income</DialogTitle>
      <DialogContent>
        <div>
          Household Income:{" "}
          <b>
            {currency} {income}
          </b>
        </div>
        <br />
        Please make sure that your household income is accurate and that you can
        provide documentation (if necessary). If you can't provide an accurate
        income at this time, click cancel.
        {fetchError ? apiError(fetchError) : null}
      </DialogContent>
      <DialogActions>
        {dialogActions(
          closeConfirmDialogAndCancel,
          () => submitFinancialAid(financialAid),
          fetchSkipStatus === FETCH_PROCESSING,
          "Submit",
          "confirm-income-button",
          fetchAddStatus === FETCH_PROCESSING
        )}
      </DialogActions>
    </Dialog>
  )

  return (
    <div>
      <Dialog
        open={calculatorDialogVisibility}
        classes={{
          paper: "dialog financial-aid-calculator",
          root:  "financial-aid-calculator-wrapper"
        }}
        onClose={closeDialogAndCancel}
      >
        <DialogTitle className="dialog-title">
          Personal Course Pricing
        </DialogTitle>
        <DialogContent className="dialog-content" dividers>
          <div className="copy">
            {`The cost of courses in the ${title} MicroMasters varies between ${minPossibleCost} and ${maxPossibleCost},
        depending on your income and ability to pay.`}
          </div>
          <div className="salary-input">
            <div className="income">
              <label>
                Income (yearly)
                {salaryField(updateCalculatorEdit, financialAid)}
              </label>
              {validationMessage("income", validation)}
            </div>
            <div className="currency">
              <div>Currency</div>
              {currencySelect(updateCalculatorEdit, financialAid)}
              {validationMessage("currency", validation)}
            </div>
          </div>
          <div className="checkbox">
            {checkBox(updateCalculatorEdit, financialAid)}
          </div>
          <div className="checkbox-alert">
            {validationMessage("checkBox", validation)}
          </div>
          {fetchError ? apiError(fetchError) : null}
        </DialogContent>

        <DialogActions>
          {calculatorActions(
            openConfirmSkipDialog,
            closeDialogAndCancel,
            () => saveFinancialAid(financialAid),
            fetchAddStatus,
            fetchSkipStatus
          )}
        </DialogActions>
      </Dialog>
      {confirmDialog}
    </div>
  )
}

const closeDialogAndCancel = dispatch => () => {
  dispatch(hideDialog(CALCULATOR_DIALOG))
  dispatch(clearCalculatorEdit())
}

const closeConfirmDialogAndCancel = dispatch => () => {
  dispatch(hideDialog(INCOME_DIALOG))
  dispatch(clearCalculatorEdit())
}

const updateFinancialAidValidation = (dispatch, current) => {
  const errors = validateFinancialAid(current)
  if (!R.equals(errors, current.validation)) {
    dispatch(updateCalculatorValidation(errors))
  }
  return R.isEmpty(errors)
}

const saveFinancialAid = R.curry((dispatch, current) => {
  const valid = updateFinancialAidValidation(dispatch, current)
  const clone = _.cloneDeep(current)
  delete clone.validation
  if (valid) {
    dispatch(hideDialog(CALCULATOR_DIALOG))
    dispatch(showDialog(INCOME_DIALOG))
  }
})

const submitFinancialAid = R.curry((dispatch, current) => {
  const { income, currency, programId } = current
  dispatch(addFinancialAid(income, currency, programId)).then(() => {
    dispatch(hideDialog(INCOME_DIALOG))
    dispatch(clearCalculatorEdit())
  })
})

const updateFinancialAidEdit = R.curry((dispatch, current) => {
  updateFinancialAidValidation(dispatch, current)
  const clone = _.cloneDeep(current)
  delete clone.validation
  dispatch(updateCalculatorEdit(clone))
})

const openConfirmSkipDialogHelper = dispatch => () => {
  closeDialogAndCancel(dispatch)()
  dispatch(setConfirmSkipDialogVisibility(true))
}

const mapStateToProps = state => {
  const { ui, financialAid, currentProgramEnrollment } = state
  const { programs } = getOwnDashboard(state)

  return {
    calculatorDialogVisibility:    ui.dialogVisibility[CALCULATOR_DIALOG] || false,
    confirmIncomeDialogVisibility: ui.dialogVisibility[INCOME_DIALOG] || false,
    financialAid,
    currentProgramEnrollment,
    programs
  }
}

const mapDispatchToProps = dispatch => {
  return {
    closeDialogAndCancel:        closeDialogAndCancel(dispatch),
    closeConfirmDialogAndCancel: closeConfirmDialogAndCancel(dispatch),
    saveFinancialAid:            saveFinancialAid(dispatch),
    submitFinancialAid:          submitFinancialAid(dispatch),
    openConfirmSkipDialog:       openConfirmSkipDialogHelper(dispatch),
    updateCalculatorEdit:        updateFinancialAidEdit(dispatch),
    ...createSimpleActionHelpers(dispatch, [
      ["clearCalculatorEdit", clearCalculatorEdit]
    ])
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FinancialAidCalculator)

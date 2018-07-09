// @flow
import React from "react"
import Grid, { Cell } from "react-mdl/lib/Grid"
import Dialog from "material-ui/Dialog"
import Card from "react-mdl/lib/Card/Card"
import IconButton from "react-mdl/lib/IconButton"
import _ from "lodash"
import { RadioButton, RadioButtonGroup } from "material-ui/RadioButton"

import { FETCH_PROCESSING } from "../actions"
import { userPrivilegeCheck, isProfileOfLoggedinUser } from "../util/util"
import { workEntriesByDate } from "../util/sorting"
import { employmentValidation } from "../lib/validation/profile"
import ProfileFormFields from "../util/ProfileFormFields"
import { dialogActions } from "./inputs/util"
import ConfirmDeletion from "./ConfirmDeletion"
import SelectField from "./inputs/SelectField"
import CountrySelectField from "./inputs/CountrySelectField"
import StateSelectField from "./inputs/StateSelectField"
import INDUSTRIES from "../data/industries"
import { formatMonthDate } from "../util/date"
import type { Option } from "../flow/generalTypes"
import type { WorkHistoryEntry } from "../flow/profileTypes"
import type { Validator, UIValidator } from "../lib/validation/profile"
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc
} from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import type { AsyncActionHelper } from "../flow/reduxTypes"
import { generateNewWorkHistory } from "../util/util"

class EmploymentForm extends ProfileFormFields {
  industryOptions: Array<Option> = INDUSTRIES.map(industry => ({
    value: industry,
    label: industry
  }))

  props: {
    profile: Profile,
    profilePatchStatus: ?string,
    ui: UIState,
    updateProfile: UpdateProfileFunc,
    saveProfile: SaveProfileFunc,
    clearProfileEdit: () => void,
    errors: ValidationErrors,
    setDeletionIndex: (i: number) => void,
    setWorkDialogVisibility: (b: boolean) => void,
    setWorkDialogIndex: (i: number) => void,
    setWorkHistoryAnswer: (b: ?boolean) => void,
    setWorkHistoryEdit: AsyncActionHelper,
    setShowWorkDeleteDialog: (b: boolean) => void,
    deletionIndex: number,
    showSwitch: boolean,
    validator: Validator | UIValidator
  }

  openNewWorkHistoryForm = (): void => {
    const {
      updateProfile,
      profile,
      setWorkDialogIndex,
      setWorkDialogVisibility,
      validator
    } = this.props
    const clone = {
      ...profile,
      work_history: [...profile.work_history, generateNewWorkHistory()]
    }
    updateProfile(clone, validator, true)
    setWorkDialogIndex(clone.work_history.length - 1)
    setWorkDialogVisibility(true)
  }

  openEditWorkHistoryForm = (index: number): void => {
    const { setWorkDialogVisibility, setWorkDialogIndex } = this.props
    setWorkDialogIndex(index)
    setWorkDialogVisibility(true)
  }

  deleteWorkHistoryEntry = (): Promise<*> => {
    const { saveProfile, profile, ui } = this.props
    const clone = _.cloneDeep(profile)
    if (ui.deletionIndex !== undefined && ui.deletionIndex !== null) {
      clone["work_history"].splice(ui.deletionIndex, 1)
    }
    return saveProfile(employmentValidation, clone, ui)
  }

  saveWorkHistoryEntry = (): void => {
    const { saveProfile, profile, ui } = this.props
    saveProfile(employmentValidation, profile, ui).then(() => {
      this.closeWorkDialog()
    })
  }

  closeWorkDialog = (): void => {
    const {
      setWorkDialogVisibility,
      clearProfileEdit,
      profile: { username }
    } = this.props
    setWorkDialogVisibility(false)
    clearProfileEdit(username)
  }

  openWorkDeleteDialog = (index: number): void => {
    const { setDeletionIndex, setShowWorkDeleteDialog } = this.props
    setDeletionIndex(index)
    setShowWorkDeleteDialog(true)
  }

  addSpaceForError(keySet: string[]) {
    const { errors } = this.props
    const value = _.get(errors, keySet)
    return value === undefined ? "" : "top-space"
  }

  editWorkHistoryForm(): React$Element<*> {
    const { ui } = this.props
    const keySet = (key): any => ["work_history", ui.workDialogIndex, key]

    return (
      <Grid className="profile-tab-grid">
        <Cell col={12}>
          {this.boundTextField(keySet("company_name"), "Name of Employer")}
        </Cell>
        <Cell col={4}>
          <CountrySelectField
            stateKeySet={keySet("state_or_territory")}
            countryKeySet={keySet("country")}
            label="Country"
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>
          <StateSelectField
            stateKeySet={keySet("state_or_territory")}
            countryKeySet={keySet("country")}
            label="State or Territory"
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={4}>{this.boundTextField(keySet("city"), "City")}</Cell>
        <Cell col={12}>
          <SelectField
            keySet={keySet("industry")}
            label="Industry"
            options={this.industryOptions}
            allowCreate={true}
            {...this.defaultInputComponentProps()}
          />
        </Cell>
        <Cell col={12}>
          {this.boundTextField(keySet("position"), "Position")}
        </Cell>
        <Cell col={6}>
          {this.boundDateField(keySet("start_date"), "Start Date", true)}
        </Cell>
        <Cell col={6}>
          {this.boundDateField(keySet("end_date"), "End Date", true)}
          <span
            className={`end-date-hint ${this.addSpaceForError(
              keySet("end_date")
            )}`}
          >
            Leave blank if this is a current position
          </span>
        </Cell>
      </Grid>
    )
  }

  renderWorkHistory(): Array<React$Element<*> | void> | void {
    const { ui, profile, profile: { work_history } } = this.props
    if (ui.workHistoryEdit === true) {
      let workHistoryRows = []
      if (!_.isUndefined(work_history)) {
        const sorted = workEntriesByDate(work_history)
        workHistoryRows = sorted.map(
          ([index, entry]) =>
            entry.id === undefined ? undefined : this.jobRow(entry, index)
        )
      }
      userPrivilegeCheck(profile, () => {
        workHistoryRows.push(
          <Cell col={12} className="profile-form-row add" key="I'm unique!">
            <button
              className="mm-minor-action add-employment-button"
              onClick={this.openNewWorkHistoryForm}
            >
              Add employment
            </button>
          </Cell>
        )
      })
      workHistoryRows.unshift(
        <Cell
          col={12}
          className="profile-form-row profile-card-header"
          key="header-row"
        >
          <span className="title">Employment</span>
        </Cell>
      )
      return workHistoryRows
    }
  }

  jobRow(position: WorkHistoryEntry, index: number) {
    const { errors, profile } = this.props

    const endDateText = () =>
      _.isEmpty(position.end_date)
        ? "Current"
        : formatMonthDate(position.end_date)
    const deleteEntry = () => this.openWorkDeleteDialog(index)
    const editEntry = () => this.openEditWorkHistoryForm(index)
    const validationAlert = () => {
      if (_.get(errors, ["work_history", String(index)])) {
        return <IconButton name="error" onClick={editEntry} />
      }
    }
    const icons = () => {
      return userPrivilegeCheck(
        profile,
        () => (
          <div className="profile-row-icons">
            {validationAlert()}
            <IconButton
              className="edit-button"
              name="edit"
              onClick={editEntry}
            />
            <IconButton
              className="delete-button"
              name="delete"
              onClick={deleteEntry}
            />
          </div>
        ),
        () => <div />
      )
    }
    return (
      <Cell
        col={12}
        className="profile-form-row row-padding row-with-border"
        key={index}
      >
        <div className="col user-credentials">
          <div className="profile-row-name">
            {`${position.company_name}, ${position.position}`}
          </div>
        </div>
        <div className="col user-credentials">
          <div className="profile-row-date-range">
            {`${formatMonthDate(position.start_date)} - ${endDateText()}`}
          </div>
          {icons()}
        </div>
      </Cell>
    )
  }

  renderWorkQuestionForm() {
    return (
      <Cell col={12} className="profile-form-row profile-card-header">
        <span className="question">Do you want to add an employer?</span>
        {this.renderWorkRadioSwitch()}
      </Cell>
    )
  }

  renderWorkRadioSwitch() {
    const { ui: { workHistoryAnswer } } = this.props
    const valueSelected = _.isNil(workHistoryAnswer) ? null : "false"
    const radioIconStyle = { marginRight: "8px" }
    return (
      <RadioButtonGroup
        className="profile-radio-group"
        name="work-history-switch"
        onChange={(event, value) => this.handleRadioClick(value)}
        valueSelected={valueSelected}
      >
        <RadioButton
          value="true"
          label="Yes"
          iconStyle={radioIconStyle}
          style={{ marginRight: "30px" }}
        />
        <RadioButton
          value="false"
          label="No"
          iconStyle={radioIconStyle}
          style={{ marginRight: "15px" }}
        />
      </RadioButtonGroup>
    )
  }

  handleRadioClick = (value: string): void => {
    const { setWorkHistoryAnswer, ui: { workHistoryAnswer } } = this.props
    if (value === "true") {
      if (!_.isNil(workHistoryAnswer)) {
        setWorkHistoryAnswer()
      }
      this.openNewWorkHistoryForm()
    } else {
      setWorkHistoryAnswer(false)
    }
  }

  renderCardBody() {
    const { showSwitch, profile: { work_history } } = this.props
    if (showSwitch && work_history.length === 0) {
      return this.renderWorkQuestionForm()
    } else {
      return this.renderWorkHistory()
    }
  }

  renderCard() {
    const { ui: { workHistoryEdit }, profile } = this.props

    if (
      !isProfileOfLoggedinUser(profile) &&
      (!profile.work_history || profile.work_history.length === 0)
    ) {
      return null
    }

    const cardClass = workHistoryEdit ? "" : "profile-tab-card-grayed"
    return (
      <Card
        shadow={1}
        className={`profile-form ${cardClass}`}
        id={`work-history-card`}
      >
        <Grid className="profile-form-grid">{this.renderCardBody()}</Grid>
      </Card>
    )
  }

  render() {
    const {
      ui: { workDialogVisibility, showWorkDeleteDialog, workDialogIndex },
      profilePatchStatus,
      profile
    } = this.props

    const inFlight = profilePatchStatus === FETCH_PROCESSING
    const keySet = (key): any => ["work_history", workDialogIndex, key]
    const id = _.get(profile, keySet("id"))
    const title = id !== undefined ? "Edit Employment" : "Add Employment"

    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteWorkHistoryEntry}
          open={showWorkDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          itemText="position"
          inFlight={inFlight}
        />
        <Dialog
          title={title}
          titleClassName="dialog-title"
          contentClassName="dialog employment-dialog"
          className="employment-dialog-wrapper"
          open={workDialogVisibility}
          onRequestClose={this.closeWorkDialog}
          actions={dialogActions(
            this.closeWorkDialog,
            this.saveWorkHistoryEntry,
            inFlight
          )}
          autoScrollBodyContent={true}
        >
          {this.editWorkHistoryForm()}
        </Dialog>
        {this.renderCard()}
      </div>
    )
  }
}

export default EmploymentForm

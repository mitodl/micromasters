// @flow
import React from "react"
import Grid from "@material-ui/core/Grid"
import Dialog from "@material-ui/core/Dialog"
import Card from "@material-ui/core/Card"
import IconButton from "@material-ui/core/IconButton"
import _ from "lodash"
import Radio from "@material-ui/core/Radio"
import RadioGroup from "@material-ui/core/RadioGroup"

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
import FormControl from "@material-ui/core/FormControl"
import FormControlLabel from "@material-ui/core/FormControlLabel"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import Icon from "@material-ui/core/Icon"
import CardContent from "@material-ui/core/CardContent"
import DialogContent from "@material-ui/core/DialogContent"

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
      <Grid container justify="center" spacing={2} className="profile-tab-grid">
        <Grid item xs={12}>
          {this.boundTextField(keySet("company_name"), "Name of Employer")}
        </Grid>
        <Grid item xs={4}>
          <CountrySelectField
            stateKeySet={keySet("state_or_territory")}
            countryKeySet={keySet("country")}
            label="Country"
            {...this.defaultInputComponentProps()}
          />
        </Grid>
        <Grid item xs={4}>
          <StateSelectField
            stateKeySet={keySet("state_or_territory")}
            countryKeySet={keySet("country")}
            label="State or Territory"
            {...this.defaultInputComponentProps()}
          />
        </Grid>
        <Grid item xs={4}>
          {this.boundTextField(keySet("city"), "City")}
        </Grid>
        <Grid item xs={12}>
          <SelectField
            keySet={keySet("industry")}
            label="Industry"
            options={this.industryOptions}
            allowCreate={true}
            {...this.defaultInputComponentProps()}
          />
        </Grid>
        <Grid item xs={12}>
          {this.boundTextField(keySet("position"), "Position")}
        </Grid>
        <Grid item xs={6}>
          {this.boundDateField(keySet("start_date"), "Start Date", true)}
        </Grid>
        <Grid item xs={6}>
          {this.boundDateField(keySet("end_date"), "End Date", true)}
          <span
            className={`end-date-hint ${this.addSpaceForError(
              keySet("end_date")
            )}`}
          >
            Leave blank if this is a current position
          </span>
        </Grid>
      </Grid>
    )
  }

  renderWorkHistory(): Array<React$Element<*> | void> | void {
    const {
      ui,
      profile,
      profile: { work_history }
    } = this.props
    if (ui.workHistoryEdit === true) {
      let workHistoryRows = []
      if (!_.isUndefined(work_history)) {
        const sorted = workEntriesByDate(work_history)
        workHistoryRows = sorted.map(([index, entry]) =>
          entry.id === undefined ? undefined : this.jobRow(entry, index)
        )
      }
      userPrivilegeCheck(profile, () => {
        workHistoryRows.push(
          <Grid item xs={12} className="profile-form-row add" key="I'm unique!">
            <button
              className="mm-minor-action add-employment-button"
              onClick={this.openNewWorkHistoryForm}
            >
              Add employment
            </button>
          </Grid>
        )
      })
      workHistoryRows.unshift(
        <Grid
          item
          xs={12}
          className="profile-form-row profile-card-header"
          key="header-row"
        >
          <span className="title">Employment</span>
        </Grid>
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
        return (
          <IconButton onClick={editEntry}>
            <Icon>error</Icon>
          </IconButton>
        )
      }
    }
    const icons = () => {
      return userPrivilegeCheck(
        profile,
        () => (
          <div className="profile-row-icons">
            {validationAlert()}
            <IconButton className="edit-button" onClick={editEntry}>
              <Icon>edit</Icon>
            </IconButton>
            <IconButton className="delete-button" onClick={deleteEntry}>
              <Icon>delete</Icon>
            </IconButton>
          </div>
        ),
        () => <div />
      )
    }
    return (
      <Grid
        item
        xs={12}
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
      </Grid>
    )
  }

  renderWorkQuestionForm() {
    return (
      <Grid item xs={12} className="profile-form-row profile-card-header">
        <span className="question">Do you want to add an employer?</span>
        {this.renderWorkRadioSwitch()}
      </Grid>
    )
  }

  renderWorkRadioSwitch() {
    const {
      ui: { workHistoryAnswer }
    } = this.props
    const valueSelected = _.isNil(workHistoryAnswer) ? null : "false"
    return (
      <FormControl>
        <RadioGroup
          className="profile-radio-group"
          name="work-history-switch"
          onChange={(event, value) => this.handleRadioClick(value)}
          value={valueSelected}
        >
          <FormControlLabel
            value="true"
            label="Yes"
            classes={{ root: "radio-style" }}
            control={<Radio />}
          />
          <FormControlLabel
            value="false"
            label="No"
            classes={{ root: "radio-style" }}
            control={<Radio />}
          />
        </RadioGroup>
      </FormControl>
    )
  }

  handleRadioClick = (value: string): void => {
    const {
      setWorkHistoryAnswer,
      ui: { workHistoryAnswer }
    } = this.props
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
    const {
      showSwitch,
      profile: { work_history }
    } = this.props
    if (showSwitch && work_history.length === 0) {
      return this.renderWorkQuestionForm()
    } else {
      return this.renderWorkHistory()
    }
  }

  renderCard() {
    const {
      ui: { workHistoryEdit },
      profile
    } = this.props

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
        className={`card profile-form ${cardClass}`}
        id={`work-history-card`}
      >
        <CardContent>
          <Grid container className="profile-form-grid">
            {this.renderCardBody()}
          </Grid>
        </CardContent>
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
          classes={{ paper: "dialog employment-dialog" }}
          className="employment-dialog-wrapper"
          open={workDialogVisibility}
          onClose={this.closeWorkDialog}
        >
          <DialogTitle className="dialog-title">{title}</DialogTitle>
          <DialogContent dividers>{this.editWorkHistoryForm()}</DialogContent>
          <DialogActions>
            {dialogActions(
              this.closeWorkDialog,
              this.saveWorkHistoryEntry,
              inFlight
            )}
          </DialogActions>
        </Dialog>
        {this.renderCard()}
      </div>
    )
  }
}

export default EmploymentForm

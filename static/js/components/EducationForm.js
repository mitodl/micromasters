// @flow
import React from "react"
import IconButton from "@material-ui/core/IconButton"
import Icon from "@material-ui/core/Icon"
import Grid from "@material-ui/core/Grid"
import Card from "@material-ui/core/Card"
import _ from "lodash"
import R from "ramda"
import Dialog from "@material-ui/core/Dialog"
import Radio from "@material-ui/core/Radio"
import RadioGroup from "@material-ui/core/RadioGroup"

import { FETCH_PROCESSING } from "../actions"
import { educationValidation } from "../lib/validation/profile"
import {
  userPrivilegeCheck,
  isProfileOfLoggedinUser,
  labelSort
} from "../util/util"
import ProfileFormFields from "../util/ProfileFormFields"
import ConfirmDeletion from "./ConfirmDeletion"
import SelectField from "./inputs/SelectField"
import CountrySelectField from "./inputs/CountrySelectField"
import StateSelectField from "./inputs/StateSelectField"
import { educationEntriesByDate } from "../util/sorting"
import { dialogActions } from "./inputs/util"
import { EDUCATION_LEVELS, HIGH_SCHOOL } from "../constants"
import type { Option } from "../flow/generalTypes"
import type {
  EducationEntry,
  Profile,
  ValidationErrors,
  SaveProfileFunc,
  UpdateProfileFunc
} from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import type { Validator, UIValidator } from "../lib/validation/profile"
import { formatMonthDate } from "../util/date"
import FIELDS_OF_STUDY from "../data/fields_of_study"
import { generateNewEducation } from "../util/util"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import FormControlLabel from "@material-ui/core/FormControlLabel"
import FormControl from "@material-ui/core/FormControl"
import CardContent from "@material-ui/core/CardContent"
import DialogContent from "@material-ui/core/DialogContent"

const fieldOfStudyOptions = labelSort(
  _.map(FIELDS_OF_STUDY, (name, code) => ({
    value: code,
    label: name
  }))
)

const EDUCATION_LEVEL_OPTIONS: Array<Option> = EDUCATION_LEVELS
const EDUCATION_LEVEL_LABELS: Object = {}
EDUCATION_LEVEL_OPTIONS.forEach(level => {
  EDUCATION_LEVEL_LABELS[level.value] = level.label
})

class EducationForm extends ProfileFormFields {
  props: {
    profile: Profile,
    profilePatchStatus: ?string,
    ui: UIState,
    updateProfile: UpdateProfileFunc,
    saveProfile: SaveProfileFunc,
    clearProfileEdit: () => void,
    errors: ValidationErrors,
    setDeletionIndex: (i: number) => void,
    setEducationDialogVisibility: () => void,
    setEducationDialogIndex: () => void,
    setEducationDegreeLevel: () => void,
    setEducationLevelAnswers: () => void,
    setShowEducationDeleteDialog: (b: boolean) => void,
    showSwitch: boolean,
    validator: Validator | UIValidator,
    updateValidationVisibility: (xs: Array<string>) => void
  }

  openEditEducationForm = (index: number): void => {
    const {
      profile,
      setEducationDialogIndex,
      setEducationDegreeLevel,
      setEducationDialogVisibility
    } = this.props

    const education = profile["education"][index]
    setEducationDialogIndex(index)
    setEducationDegreeLevel(education.degree_name)
    setEducationDialogVisibility(true)
  }

  openNewEducationForm = (level: string): void => {
    const {
      profile,
      updateProfile,
      setEducationDialogIndex,
      setEducationDegreeLevel,
      setEducationDialogVisibility,
      validator
    } = this.props
    const clone = {
      ...profile,
      education: [...profile.education, generateNewEducation(level)]
    }
    updateProfile(clone, validator, true)
    setEducationDialogIndex(clone.education.length - 1)
    setEducationDegreeLevel(level)
    setEducationDialogVisibility(true)
  }

  deleteEducationEntry = (): Promise<*> => {
    const { saveProfile, profile, ui } = this.props
    const clone = _.cloneDeep(profile)
    if (ui.deletionIndex !== undefined && ui.deletionIndex !== null) {
      clone["education"].splice(ui.deletionIndex, 1)
    }
    return saveProfile(educationValidation, clone, ui)
  }

  educationLevelRadioSwitch = (level: Option): React$Element<*> => {
    const {
      ui: { educationLevelAnswers }
    } = this.props
    const valueSelected = level.value in educationLevelAnswers ? "false" : null
    return (
      <FormControl>
        <RadioGroup
          className={`profile-radio-group ${level.value}`}
          id={`profile-tab-education-switch-${level.value}`}
          name={`profile-tab-education-switch-${level.value}`}
          onChange={(event, value) => this.handleRadioClick(value, level.value)}
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

  handleRadioClick(value: string, level: string): void {
    const {
      setEducationLevelAnswers,
      ui: { educationLevelAnswers }
    } = this.props
    if (value === "true") {
      if (level in educationLevelAnswers) {
        setEducationLevelAnswers(_.omit(educationLevelAnswers, [level]))
      }
      this.openNewEducationForm(level)
    } else {
      setEducationLevelAnswers({
        ...educationLevelAnswers,
        [level]: "No"
      })
    }
  }

  renderEducationQuestionForm(level: Option): React$Element<*> {
    const label = level.label
    const prefix = label.toLowerCase().startsWith("a") ? "an" : "a"
    const levelName = !label.endsWith("degree")
      ? `${label.toLowerCase()} degree`
      : label.toLowerCase()
    return (
      <Grid item xs={12} className="profile-card-header profile-form-row">
        <span className="question">
          {`Do you have ${prefix} ${levelName}?`}
        </span>
        {this.educationLevelRadioSwitch(level)}
      </Grid>
    )
  }

  renderEducationLevelEntries(
    level: any
  ): Array<React$Element<*> | void> | void {
    const { profile } = this.props
    let levelValue = HIGH_SCHOOL
    let filterDegreeName = () => true
    let title
    if (!_.isNil(level)) {
      levelValue = level.value
      const label = EDUCATION_LEVEL_LABELS[levelValue]
      filterDegreeName = ([, entry]) => entry.degree_name === level.value
      title = (
        <Grid item xs={12} className="profile-form-row" key="header-row">
          <strong>{label}</strong>
        </Grid>
      )
    }

    const renderedEducationRows = R.compose(
      R.map(this.educationRow(_.isNil(level))),
      R.filter(filterDegreeName),
      educationEntriesByDate
    )

    return [
      title,
      ...renderedEducationRows(profile.education),
      userPrivilegeCheck(
        profile,
        () => (
          <Grid item xs={12} className="profile-form-row add" key="add-row">
            <button
              className="mm-minor-action add-education-button"
              onClick={() => this.openNewEducationForm(levelValue)}
            >
              Add a degree
            </button>
          </Grid>
        ),
        null
      )
    ]
  }

  renderEducationLevel(
    level: Option
  ): Array<React$Element<*> | void> | React$Element<*> | void {
    if (this.hasEducationAtLevel(level.value)) {
      return this.renderEducationLevelEntries(level)
    } else {
      return this.renderEducationQuestionForm(level)
    }
  }

  educationRow = R.curry(
    (showLevel: boolean, [index, education]: [number, EducationEntry]) => {
      const { errors, profile } = this.props
      if (!("id" in education)) {
        // don't show new educations, wait until we saved on the server before showing them
        return
      }
      const deleteEntry = () => this.openEducationDeleteDialog(index)
      const editEntry = () => this.openEditEducationForm(index)
      const validationAlert = () => {
        if (_.get(errors, ["education", String(index)])) {
          return <IconButton name="error" onClick={editEntry} />
        }
      }

      let level
      if (showLevel) {
        const degree = EDUCATION_LEVEL_LABELS[education.degree_name]
        level = <div>{degree}</div>
      }
      const icons = () => (
        <div className="profile-row-icons">
          {validationAlert()}
          <IconButton className="edit-button" onClick={editEntry}>
            <Icon>edit</Icon>
          </IconButton>
          <IconButton className="delete-button" onClick={deleteEntry}>
            <Icon>delete</Icon>
          </IconButton>
        </div>
      )
      return (
        <Grid
          item
          xs={12}
          className="profile-form-row row-padding row-with-border"
          key={index}
        >
          <div className="col user-credentials">
            <div className="profile-row-name">
              <div className="school-type">{level}</div>
              <div className="school-name">{education.school_name}</div>
            </div>
          </div>
          <div className="col user-credentials">
            <div className="profile-row-date-range">
              {formatMonthDate(education.graduation_date)}
            </div>
            {userPrivilegeCheck(profile, icons, () => (
              <div />
            ))}
          </div>
        </Grid>
      )
    }
  )

  hasEducationAtLevel(levelValue: string): boolean {
    const {
      profile: { education }
    } = this.props
    return !_.isUndefined(
      education.find(entry => entry.degree_name === levelValue)
    )
  }

  clearEducationEdit = (): void => {
    const {
      setEducationDialogVisibility,
      setEducationDegreeLevel,
      setEducationDialogIndex,
      clearProfileEdit,
      profile: { username }
    } = this.props
    setEducationDialogVisibility(false)
    setEducationDegreeLevel("")
    setEducationDialogIndex(null)
    clearProfileEdit(username)
  }

  saveEducationForm = (): void => {
    const { saveProfile, profile, ui } = this.props
    saveProfile(educationValidation, profile, ui).then(this.clearEducationEdit)
  }

  openEducationDeleteDialog = (index: number): void => {
    const { setDeletionIndex, setShowEducationDeleteDialog } = this.props
    setDeletionIndex(index)
    setShowEducationDeleteDialog(true)
  }

  editEducationForm = (): React$Element<*> => {
    const {
      ui: { educationDialogIndex },
      showSwitch,
      profile
    } = this.props

    const keySet = (key): any => ["education", educationDialogIndex, key]
    const educationDegreeLevel = _.get(profile, keySet("degree_name"))

    const fieldOfStudy = () => {
      if (educationDegreeLevel !== HIGH_SCHOOL) {
        return (
          <Grid item xs={12}>
            <SelectField
              options={fieldOfStudyOptions}
              keySet={keySet("field_of_study")}
              label="Field of Study"
              allowCreate={true}
              {...this.defaultInputComponentProps()}
            />
          </Grid>
        )
      }
    }
    const levelForm = () => {
      if (!showSwitch) {
        return (
          <Grid item xs={12}>
            <SelectField
              keySet={keySet("degree_name")}
              label="Degree Type"
              options={EDUCATION_LEVELS}
              {...this.defaultInputComponentProps()}
            />
          </Grid>
        )
      }
    }

    return (
      <Grid container spacing={3} className="profile-tab-grid">
        {levelForm()}
        {fieldOfStudy()}
        <Grid item xs={12}>
          {this.boundTextField(keySet("school_name"), "School Name")}
        </Grid>
        <Grid item xs={12}>
          {this.boundDateField(
            keySet("graduation_date"),
            "Graduation Date",
            true,
            true
          )}
        </Grid>
        <Grid item xs={4}>
          <CountrySelectField
            stateKeySet={keySet("school_state_or_territory")}
            countryKeySet={keySet("school_country")}
            label="Country"
            topMenu={true}
            {...this.defaultInputComponentProps()}
          />
        </Grid>
        <Grid item xs={4}>
          <StateSelectField
            stateKeySet={keySet("school_state_or_territory")}
            countryKeySet={keySet("school_country")}
            label="State"
            topMenu={true}
            {...this.defaultInputComponentProps()}
          />
        </Grid>
        <Grid item xs={4} key="school_city">
          {this.boundTextField(keySet("school_city"), "City")}
        </Grid>
      </Grid>
    )
  }

  renderCard() {
    const { showSwitch, profile } = this.props

    const cardClass = levelValue =>
      this.hasEducationAtLevel(levelValue) ? "" : "collapsed"

    if (showSwitch) {
      return EDUCATION_LEVEL_OPTIONS.map(level => {
        return (
          <Card
            shadow={1}
            className={`card profile-form ${cardClass(level.value)}`}
            key={level.label}
          >
            <Grid container className="profile-form-grid">
              {this.renderEducationLevel(level)}
            </Grid>
          </Card>
        )
      })
    } else if (profile !== undefined) {
      if (
        !isProfileOfLoggedinUser(profile) &&
        (!profile.education || profile.education.length === 0)
      ) {
        return null
      }

      return (
        <Card shadow={1} className="card profile-form" id="education-card">
          <CardContent>
            <Grid container className="profile-form-grid">
              <Grid
                item
                xs={12}
                className="profile-form-row profile-card-header"
              >
                <span className="title">Education</span>
              </Grid>
              {this.renderEducationLevelEntries(null)}
            </Grid>
          </CardContent>
        </Card>
      )
    } else {
      return null
    }
  }

  render() {
    const {
      ui: {
        educationDialogIndex,
        showEducationDeleteDialog,
        educationDialogVisibility
      },
      profilePatchStatus,
      profile
    } = this.props

    const inFlight = profilePatchStatus === FETCH_PROCESSING
    const keySet = (key): any => ["education", educationDialogIndex, key]
    const id = _.get(profile, keySet("id"))
    const degreeName =
      EDUCATION_LEVEL_LABELS[_.get(profile, keySet("degree_name"))]
    const title =
      id !== undefined ? `Edit ${degreeName}` : `Add a ${degreeName}`

    return (
      <div>
        <ConfirmDeletion
          deleteFunc={this.deleteEducationEntry}
          open={showEducationDeleteDialog}
          close={this.closeConfirmDeleteDialog}
          itemText="degree"
          inFlight={inFlight}
        />
        <Dialog
          classes={{
            paper: "dialog education-dialog",
            root:  "education-dialog-wrapper"
          }}
          open={educationDialogVisibility}
          onClose={this.clearEducationEdit}
        >
          <DialogTitle className="dialog-title">{title}</DialogTitle>
          <DialogContent dividers>{this.editEducationForm()}</DialogContent>
          <DialogActions>
            {dialogActions(
              this.clearEducationEdit,
              this.saveEducationForm,
              inFlight
            )}
          </DialogActions>
        </Dialog>
        {this.renderCard()}
      </div>
    )
  }
}

export default EducationForm

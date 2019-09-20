// @flow
/* global SETTINGS: false */
import DocumentTitle from "react-document-title"
import React from "react"
import _ from "lodash"
import Card from "@material-ui/core/Card"
import R from "ramda"
import Select from "react-select"

import PersonalForm from "./PersonalForm"
import ProfileProgressControls from "./ProfileProgressControls"
import {
  combineValidators,
  personalValidation,
  programValidation,
  profileImageValidation
} from "../lib/validation/profile"
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc
} from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import type {
  AvailableProgram,
  AvailablePrograms
} from "../flow/enrollmentTypes"
import { validationErrorSelector } from "../util/util"
import type { Option } from "../flow/generalTypes"
import { setProfileStep } from "../actions/ui"
import { PERSONAL_STEP } from "../constants"
import ProfileImage from "../containers/ProfileImage"
import Typography from "@material-ui/core/Typography"
import CardContent from "@material-ui/core/CardContent"

const personalTabValidator = combineValidators(
  personalValidation,
  programValidation,
  profileImageValidation
)

export default class PersonalTab extends React.Component {
  props: {
    addProgramEnrollment: (p: number) => void,
    currentProgramEnrollment: AvailableProgram,
    errors: ValidationErrors,
    nextStep: () => void,
    prevStep: () => void,
    profile: Profile,
    profilePatchStatus: ?string,
    uneditedProfile: Profile,
    programs: AvailablePrograms,
    saveProfile: SaveProfileFunc,
    setProgram: Function,
    ui: UIState,
    updateProfile: UpdateProfileFunc,
    dispatch: Function
  }

  sortPrograms = R.sortBy(
    R.compose(
      R.toLower,
      R.prop("title")
    )
  )

  programOptions = R.compose(
    R.map(program => ({ value: program.id, label: program.title })),
    this.sortPrograms
  )

  componentDidMount() {
    const { dispatch } = this.props
    dispatch(setProfileStep(PERSONAL_STEP))
  }

  componentDidUpdate() {
    const { currentProgramEnrollment, setProgram } = this.props
    const selectedProgram = this.getSelectedProgramId()
    if (currentProgramEnrollment && !selectedProgram) {
      setProgram(currentProgramEnrollment)
    }
  }

  onProgramSelect = (selection: Option): void => {
    const { programs, setProgram } = this.props
    if (selection && selection.value) {
      const selected = programs.find(
        program => program.id === parseInt(selection.value)
      )
      setProgram(selected)
    } else {
      setProgram(null)
    }
  }

  getSelectedProgramId = (): number | null => {
    const {
      ui: { selectedProgram }
    } = this.props
    return selectedProgram ? selectedProgram.id : null
  }

  selectProgram = (): React$Element<*> => {
    const { programs, errors } = this.props
    return (
      <Select
        value={this.getSelectedProgramId()}
        onChange={this.onProgramSelect}
        clearable={false}
        className={`program-selectfield ${validationErrorSelector(errors, [
          "program"
        ])}`}
        errorText={_.get(errors, "program")}
        options={this.programOptions(programs)}
      />
    )
  }

  render() {
    const {
      ui: { selectedProgram },
      errors,
      uneditedProfile
    } = this.props

    return (
      <DocumentTitle title="Personal Profile | MITx MicroMasters">
        <div>
          <Card shadow={1} className="card program-select">
            <CardContent>
              <Typography component="h2">
                Which MicroMasters program are you signing up for?
              </Typography>
              {this.selectProgram()}
              <span className="validation-error-text">
                {_.get(errors, ["program"])}
              </span>
            </CardContent>
          </Card>
          <Card
            shadow={1}
            className={`card profile-image ${validationErrorSelector(errors, [
              "image"
            ])}`}
          >
            <CardContent>
              <Typography component="h2">Upload Profile Photo</Typography>
              <ProfileImage
                profile={uneditedProfile}
                editable={true}
                showLink={true}
                linkText="Click here to add a profile photo"
              />
              <span className="validation-error-text">
                {_.get(errors, ["image"])}
              </span>
            </CardContent>
          </Card>
          <Card shadow={1} className="card profile-form">
            <CardContent>
              <PersonalForm {...this.props} validator={personalValidation} />
            </CardContent>
          </Card>
          <ProfileProgressControls
            {...this.props}
            nextUrl="/profile/education"
            nextBtnLabel="Next"
            programIdForEnrollment={selectedProgram ? selectedProgram.id : null}
            isLastTab={false}
            validator={personalTabValidator}
          />
        </div>
      </DocumentTitle>
    )
  }
}

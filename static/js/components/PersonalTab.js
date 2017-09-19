// @flow
/* global SETTINGS: false */
import DocumentTitle from "react-document-title"
import React from "react"
import _ from "lodash"
import Card from "react-mdl/lib/Card/Card"
import CardTitle from "react-mdl/lib/Card/CardTitle"
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
  ProfileFetchResponse,
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

  sortPrograms = R.sortBy(R.compose(R.toLower, R.prop("title")))

  programOptions = R.compose(
    R.map(program => ({ value: program.id, label: program.title })),
    this.sortPrograms
  )

  componentWillMount() {
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
      let selected = programs.find(
        program => program.id === parseInt(selection.value)
      )
      setProgram(selected)
    } else {
      setProgram(null)
    }
  }

  getSelectedProgramId = (): number | null => {
    const { ui: { selectedProgram } } = this.props
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

  afterImageUpload = (fetchResponse: ProfileFetchResponse): void => {
    const { profile, updateProfile } = this.props
    let editState = _.cloneDeep(profile)
    let { payload: { profile: { image } } } = fetchResponse
    let newEditState = { ...editState, image }
    updateProfile(newEditState, personalTabValidator)
  }

  render() {
    const { ui: { selectedProgram }, errors, uneditedProfile } = this.props

    return (
      <DocumentTitle title="Personal Profile | MITx MicroMasters">
        <div>
          <Card shadow={1} className="program-select">
            <CardTitle>
              Which MicroMasters program are you signing up for?
            </CardTitle>
            {this.selectProgram()}
            <span className="validation-error-text">
              {_.get(errors, ["program"])}
            </span>
          </Card>
          <Card
            shadow={1}
            className={`profile-image ${validationErrorSelector(errors, [
              "image"
            ])}`}
          >
            <CardTitle>Upload a Profile Photo</CardTitle>
            <ProfileImage
              profile={uneditedProfile}
              editable={true}
              showLink={true}
              linkText="Click here to add a profile photo"
              afterImageUpload={this.afterImageUpload}
            />
            <span className="validation-error-text">
              {_.get(errors, ["image"])}
            </span>
          </Card>
          <Card shadow={1} className="profile-form">
            <PersonalForm {...this.props} validator={personalValidation} />
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

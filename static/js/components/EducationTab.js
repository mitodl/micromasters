// @flow
import React from "react"
import DocumentTitle from "react-document-title"

import ProfileProgressControls from "./ProfileProgressControls"
import EducationForm from "./EducationForm"
import { educationValidation } from "../lib/validation/profile"
import type { Profile, SaveProfileFunc } from "../flow/profileTypes"
import type { UIState } from "../reducers/ui"
import { setProfileStep } from "../actions/ui"
import { EDUCATION_STEP } from "../constants"

class EducationTab extends React.Component {
  props: {
    profile: Profile,
    profilePatchStatus: ?string,
    ui: UIState,
    saveProfile: SaveProfileFunc,
    addProgramEnrollment: (p: number) => void,
    dispatch: Function
  }

  componentDidMount() {
    const { dispatch } = this.props
    dispatch(setProfileStep(EDUCATION_STEP))
  }

  render() {
    return (
      <DocumentTitle title="Education Profile | MITx MicroMasters">
        <div>
          <EducationForm
            {...this.props}
            showSwitch={true}
            validator={educationValidation}
          />
          <ProfileProgressControls
            {...this.props}
            prevUrl="/profile/personal"
            nextUrl="/profile/professional"
            nextBtnLabel="Next"
            isLastTab={false}
            programIdForEnrollment={null}
            validator={educationValidation}
          />
        </div>
      </DocumentTitle>
    )
  }
}

export default EducationTab

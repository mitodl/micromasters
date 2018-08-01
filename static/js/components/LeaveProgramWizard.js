// @flow
/* global SETTINGS: false */
import React from "react"
import type { Dispatch } from "redux"
import { Card } from "react-mdl/lib/Card"
import Dialog from "material-ui/Dialog"
import SelectField from "material-ui/SelectField"
import MenuItem from "material-ui/MenuItem"
import R from "ramda"
import { dialogActions } from "./inputs/util"
import _ from "lodash"

import ProfileFormFields from "../util/ProfileFormFields"
import { showDialog, hideDialog, setProgramsToUnEnroll } from "../actions/ui"
import {
  unEnrollProgramEnrollments,
  UNENROLL_PROGRAM_DIALOG
} from "../actions/programs"
import type { Profile } from "../flow/profileTypes"
import type {
  AvailableProgramsState,
  AvailableProgram
} from "../flow/enrollmentTypes"
import type { UIState } from "../reducers/ui"

const selectStyle = {
  backgroundColor: "#ffff",
  border:          "1px solid #c3c1c1",
  padding:         "0 10px",
  borderRadius:    "3px",
  height:          "40px",
  marginTop:       "7px"
}
const underlineStyle = {
  borderBottom: "0",
  bottom:       "0"
}
const hintStyle = {
  color:  "#a2a2a2",
  bottom: "5px"
}
const isVisible = R.propOr(false, UNENROLL_PROGRAM_DIALOG)
const enrolledInPrograms = (programs: AvailableProgramsState) =>
  R.filter((program: AvailableProgram) => program.enrolled, programs)

class LeaveProgramWizard extends ProfileFormFields {
  props: {
    dispatch: Dispatch,
    profile: Profile,
    programs: AvailableProgramsState,
    ui: UIState
  }

  onProgramUnEnrollChange = (
    event: Event,
    index: ?number,
    values: Array<number>
  ) => {
    const { dispatch } = this.props
    dispatch(setProgramsToUnEnroll(_.uniq(values)))
  }

  unEnrollUserTask = () => {
    const { dispatch, ui: { programsToUnEnroll } } = this.props
    if (!_.isEmpty(programsToUnEnroll)) {
      dispatch(unEnrollProgramEnrollments(programsToUnEnroll))
    }
  }

  menuItems = (programs: Array<AvailableProgram>) => {
    const { ui: { programsToUnEnroll = [] } } = this.props
    return programs.map((program: AvailableProgram) => (
      <MenuItem
        key={program.id}
        insetChildren={true}
        checked={R.and(
          R.not(R.isEmpty(programsToUnEnroll)),
          R.not(_.isUndefined(programsToUnEnroll.find(id => id === program.id)))
        )}
        value={program.id}
        primaryText={program.title}
      />
    ))
  }

  renderUnenrollUI = () => {
    const { ui: { programsToUnEnroll = [] }, programs } = this.props
    const enrolledPrograms = enrolledInPrograms(programs)
    return (
      <SelectField
        multiple={true}
        hintText="Select"
        value={programsToUnEnroll}
        onChange={this.onProgramUnEnrollChange}
        style={selectStyle}
        underlineStyle={underlineStyle}
        hintStyle={hintStyle}
      >
        {this.menuItems(enrolledPrograms)}
      </SelectField>
    )
  }

  closeDialog = () => {
    const { dispatch } = this.props
    dispatch(hideDialog(UNENROLL_PROGRAM_DIALOG))
  }

  renderDialog = () => {
    const {
      ui: {
        dialogVisibility,
        programsToUnEnrollInFlight,
        programsToUnEnroll = []
      }
    } = this.props
    return (
      <Dialog
        title="Leave a MicroMasters Program(s)"
        titleClassName="dialog-title"
        contentClassName="dialog unenroll-dialog"
        className="unenroll-dialog-wrapper"
        open={isVisible(dialogVisibility)}
        onRequestClose={() => this.closeDialog()}
        autoScrollBodyContent={true}
        maxWidth="xs"
        actions={dialogActions(
          this.closeDialog,
          this.unEnrollUserTask,
          programsToUnEnrollInFlight,
          "LEAVE SELECTED PROGRAM(S)",
          "",
          programsToUnEnroll.length === 0
        )}
      >
        <div className="unenroll-settings">
          <p>
            When you leave a MicroMasters program, you will no longer be able to
            participate in discussions or receive any email about that program.
          </p>
          <Card className="unenroll-settings-card">
            <div className="remind">Which program do you want to leave?</div>
            {this.renderUnenrollUI()}
          </Card>
        </div>
      </Dialog>
    )
  }

  render() {
    const { dispatch } = this.props
    return (
      <div>
        <Card shadow={1} className="other-settings">
          <h4 className="heading">Other Settings</h4>
          <div className="other-settings-row">
            <button
              className="mm-minor-action unenroll-wizard-button"
              onClick={() => dispatch(showDialog(UNENROLL_PROGRAM_DIALOG))}
            >
              Leave a MicroMasters Program
            </button>
          </div>
        </Card>
        {this.renderDialog()}
      </div>
    )
  }
}

export default LeaveProgramWizard

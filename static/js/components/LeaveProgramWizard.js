// @flow
/* global SETTINGS: false */
import React from "react"
import type { Dispatch } from "redux"
import Card from "@material-ui/core/Card"
import Dialog from "@material-ui/core/Dialog"
import Select from "@material-ui/core/Select"
import MenuItem from "@material-ui/core/MenuItem"
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
import CardContent from "@material-ui/core/CardContent"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import DialogActions from "@material-ui/core/DialogActions"
import FormControl from "@material-ui/core/FormControl"
import InputLabel from "@material-ui/core/InputLabel"

const selectStyle = {
  backgroundColor: "#ffff",
  border:          "1px solid #c3c1c1",
  padding:         "0 10px",
  borderRadius:    "3px",
  height:          "40px"
}

const formControl = {
  minWidth: "75%"
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

  onProgramUnEnrollChange = (event: any) => {
    const { dispatch } = this.props
    dispatch(setProgramsToUnEnroll(_.uniq(event.target.value)))
  }

  unEnrollUserTask = () => {
    const {
      dispatch,
      ui: { programsToUnEnroll }
    } = this.props
    if (!_.isEmpty(programsToUnEnroll)) {
      dispatch(unEnrollProgramEnrollments(programsToUnEnroll))
    }
  }

  menuItems = (programs: Array<AvailableProgram>) => {
    const {
      ui: { programsToUnEnroll = [] }
    } = this.props
    return programs.map((program: AvailableProgram) => (
      <MenuItem
        key={program.id}
        selected={R.and(
          R.not(R.isEmpty(programsToUnEnroll)),
          R.not(_.isUndefined(programsToUnEnroll.find(id => id === program.id)))
        )}
        value={program.id}
      >
        {program.title}
      </MenuItem>
    ))
  }

  renderUnenrollUI = () => {
    const {
      ui: { programsToUnEnroll = [] },
      programs
    } = this.props
    const enrolledPrograms = enrolledInPrograms(programs)
    return (
      <FormControl className="select-program" style={formControl}>
        <InputLabel shrink>Select Program</InputLabel>
        <Select
          multiple
          autoWidth
          value={programsToUnEnroll}
          onChange={this.onProgramUnEnrollChange}
          style={selectStyle}
        >
          {this.menuItems(enrolledPrograms)}
        </Select>
      </FormControl>
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
        classes={{ paper: "dialog unenroll-dialog" }}
        className="unenroll-dialog-wrapper"
        open={isVisible(dialogVisibility)}
        onClose={() => this.closeDialog()}
      >
        <DialogTitle className="dialog-title">
          Leave a MicroMasters Program(s)
        </DialogTitle>
        <DialogContent>
          <div className="unenroll-settings">
            <p>
              When you leave a MicroMasters program, you will no longer be able
              to participate in discussions or receive any email about that
              program.
            </p>
            <Card shadow={0} className="card unenroll-settings-card">
              <CardContent>
                <div className="remind">
                  Which program do you want to leave?
                </div>
                {this.renderUnenrollUI()}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
        <DialogActions>
          {dialogActions(
            this.closeDialog,
            this.unEnrollUserTask,
            programsToUnEnrollInFlight,
            "LEAVE SELECTED PROGRAM(S)",
            "",
            programsToUnEnroll.length === 0
          )}
        </DialogActions>
      </Dialog>
    )
  }

  render() {
    const { dispatch } = this.props
    return (
      <div>
        <Card shadow={1} className="card other-settings">
          <CardContent>
            <h4 className="heading">Other Settings</h4>
            <div className="other-settings-row">
              <button
                className="mm-minor-action unenroll-wizard-button"
                onClick={() => dispatch(showDialog(UNENROLL_PROGRAM_DIALOG))}
              >
                Leave a MicroMasters Program
              </button>
            </div>
          </CardContent>
        </Card>
        {this.renderDialog()}
      </div>
    )
  }
}

export default LeaveProgramWizard

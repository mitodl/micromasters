import React from "react"
import Dialog from "@material-ui/core/Dialog"
import _ from "lodash"
import Select from "@material-ui/core/Select"
import MenuItem from "@material-ui/core/MenuItem"

import { FETCH_PROCESSING } from "../actions"
import { dialogActions } from "./inputs/util"
import type { AvailablePrograms } from "../flow/enrollmentTypes"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import InputLabel from "@material-ui/core/InputLabel"
import FormControl from "@material-ui/core/FormControl"
import DialogContent from "@material-ui/core/DialogContent"
import FormHelperText from "@material-ui/core/FormHelperText"

export default class ProgramEnrollmentDialog extends React.Component {
  props: {
    enrollInProgram: (programId: number) => void,
    programs: AvailablePrograms,
    selectedProgram: ?number,
    fetchAddStatus?: string,
    error: ?string,
    visibility: boolean,
    setError: (error: ?string) => void,
    setVisibility: (open: boolean) => void,
    setSelectedProgram: (programId: ?number) => void
  }

  closeDialog = () => {
    const { setVisibility } = this.props
    setVisibility(false)
  }

  enrollInProgram = () => {
    const { enrollInProgram, selectedProgram, setError } = this.props

    if (_.isNil(selectedProgram)) {
      setError("No program selected")
    } else {
      enrollInProgram(selectedProgram)
    }
  }

  handleSelectedProgramChange = event => {
    const { setSelectedProgram } = this.props
    setSelectedProgram(event.target.value)
  }

  render() {
    const {
      error,
      visibility,
      selectedProgram,
      programs,
      fetchAddStatus
    } = this.props

    const unenrolledPrograms = _.sortBy(
      programs.filter(program => !program.enrolled),
      "title"
    )
    const options = unenrolledPrograms.map(program => (
      <MenuItem className="menu-item" value={program.id} key={program.id}>
        {program.title}
      </MenuItem>
    ))

    const actions = dialogActions(
      this.closeDialog,
      this.enrollInProgram,
      fetchAddStatus === FETCH_PROCESSING,
      "Enroll",
      "enroll-button"
    )
    // onRequestClose is not used below because an extra click or touch event causes material-ui
    // to close the dialog right after opening it. See https://github.com/JedWatson/react-select/issues/532
    return (
      <Dialog
        classes={{ paper: "dialog enroll-program-dialog" }}
        className="enroll-program-dialog-wrapper"
        open={visibility}
        maxWidth="md"
      >
        <DialogTitle className="dialog-title">
          Enroll in a new MicroMasters Program
        </DialogTitle>
        <DialogContent>
          <FormControl className="select-program">
            <InputLabel>Select Program</InputLabel>
            <Select
              value={selectedProgram || ""}
              onChange={this.handleSelectedProgramChange}
              error={!!error}
              style={{
                width: "500px"
              }}
            >
              {options}
            </Select>
            <FormHelperText error className="error-helper-text">
              {error}
            </FormHelperText>
          </FormControl>
        </DialogContent>
        <DialogActions>{actions}</DialogActions>
      </Dialog>
    )
  }
}

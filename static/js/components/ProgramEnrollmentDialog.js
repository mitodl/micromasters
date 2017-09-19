import React from "react"
import Dialog from "material-ui/Dialog"
import _ from "lodash"
import SelectField from "material-ui/SelectField"
import MenuItem from "material-ui/MenuItem"

import { FETCH_PROCESSING } from "../actions"
import { dialogActions } from "./inputs/util"
import type { AvailablePrograms } from "../flow/enrollmentTypes"

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

  handleSelectedProgramChange = (event, index, value) => {
    const { setSelectedProgram } = this.props
    setSelectedProgram(value)
  }

  render() {
    const {
      error,
      visibility,
      selectedProgram,
      programs,
      fetchAddStatus
    } = this.props

    let unenrolledPrograms = _.sortBy(
      programs.filter(program => !program.enrolled),
      "title"
    )
    let options = unenrolledPrograms.map(program => (
      <MenuItem
        value={program.id}
        primaryText={program.title}
        key={program.id}
      />
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
        title="Enroll in a new MicroMasters Program"
        titleClassName="dialog-title"
        contentClassName="dialog enroll-program-dialog"
        className="enroll-program-dialog-wrapper"
        open={visibility}
        actions={actions}
      >
        <SelectField
          value={selectedProgram}
          onChange={this.handleSelectedProgramChange}
          floatingLabelText="Select Program"
          errorText={error}
          fullWidth={true}
          style={{
            width: "500px"
          }}
          menuStyle={{
            width:    "500px",
            overflow: "hidden"
          }}
        >
          {options}
        </SelectField>
      </Dialog>
    )
  }
}

// @flow
/* global SETTINGS: false */
import React from "react"
import _ from "lodash"
import Select from "react-select"

import ProgramEnrollmentDialog from "./ProgramEnrollmentDialog"
import type {
  AvailableProgram,
  AvailablePrograms
} from "../flow/enrollmentTypes"
import type { Option } from "../flow/generalTypes"

const ENROLL_SENTINEL = "enroll"

export default class ProgramSelector extends React.Component {
  props: {
    addProgramEnrollment: (programId: number) => Promise<*>,
    currentProgramEnrollment: AvailableProgram,
    programs: AvailablePrograms,
    fetchAddStatus?: string,
    enrollDialogError: ?string,
    enrollDialogVisibility: boolean,
    enrollSelectedProgram: ?number,
    setCurrentProgramEnrollment: (enrollment: AvailableProgram) => void,
    setEnrollDialogError: (error: ?string) => void,
    setEnrollDialogVisibility: (open: boolean) => void,
    setEnrollSelectedProgram: (programId: ?number) => void,
    selectorVisibility: boolean
  }

  selectEnrollment = (option: Option): void => {
    const {
      programs,
      setCurrentProgramEnrollment,
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram
    } = this.props
    if (option.value === ENROLL_SENTINEL) {
      setEnrollDialogVisibility(true)
      setEnrollSelectedProgram(null)
      setEnrollDialogError(null)
    } else {
      const selected = programs.find(program => program.id === option.value)
      if (selected) {
        setCurrentProgramEnrollment(selected)
      }
    }
  }

  makeOptions = (): Array<Option> => {
    const { currentProgramEnrollment, programs } = this.props

    let currentId
    if (!_.isNil(currentProgramEnrollment)) {
      currentId = currentProgramEnrollment.id
    }

    const sortedPrograms = _.sortBy(programs, "title")
    const enrolledPrograms = sortedPrograms.filter(program => program.enrolled)
    const unenrolledPrograms = sortedPrograms.filter(
      program => !program.enrolled
    )
    const unselected = enrolledPrograms.filter(
      enrollment => enrollment.id !== currentId
    )

    const options = unselected.map(enrollment => ({
      value: enrollment.id,
      label: enrollment.title
    }))
    if (unenrolledPrograms.length > 0) {
      options.push({ label: "Enroll in a new program", value: ENROLL_SENTINEL })
    }
    return options
  }

  render() {
    const {
      addProgramEnrollment,
      programs,
      enrollDialogError,
      enrollDialogVisibility,
      enrollSelectedProgram,
      fetchAddStatus,
      currentProgramEnrollment,
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram,
      selectorVisibility
    } = this.props
    let currentId
    if (!_.isNil(currentProgramEnrollment)) {
      currentId = currentProgramEnrollment.id
    }

    const selected = programs.find(enrollment => enrollment.id === currentId)
    const options = this.makeOptions()

    if (!SETTINGS.user) {
      return (
        <div className="user-menu no-auth">
          <a
            href="/login/edxorg/"
            className="mdl-button button-login open-signup-dialog"
          >
            Sign In
          </a>
          <a
            href="/login/edxorg/"
            className="mdl-button button-signup open-signup-dialog"
          >
            Create Account
          </a>
        </div>
      )
    } else {
      if (programs.length === 0 || selectorVisibility === false) {
        return <div className="program-selector" />
      } else {
        return (
          <div className="program-selector">
            <Select
              options={options}
              onChange={this.selectEnrollment}
              searchable={false}
              placeholder={selected ? selected.title : ""}
              clearable={false}
              tabSelectsValue={false}
            />
            <ProgramEnrollmentDialog
              enrollInProgram={addProgramEnrollment}
              programs={programs}
              selectedProgram={enrollSelectedProgram}
              error={enrollDialogError}
              visibility={enrollDialogVisibility}
              setError={setEnrollDialogError}
              setVisibility={setEnrollDialogVisibility}
              setSelectedProgram={setEnrollSelectedProgram}
              fetchAddStatus={fetchAddStatus}
            />
          </div>
        )
      }
    }
  }
}

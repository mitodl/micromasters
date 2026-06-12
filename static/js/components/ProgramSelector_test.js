import { assert } from "chai"
import { shallow } from "enzyme"
import _ from "lodash"
import React from "react"
import Select from "react-select"
import sinon from "sinon"

import ProgramSelector from "./ProgramSelector"
import { PROGRAMS } from "../test_constants"

describe("ProgramSelector", () => {
  let sandbox
  // make a copy of enrollments
  const programs = _.cloneDeep(PROGRAMS)
  // remove one enrollment so not all enrollments are enrolled
  const unenrolled = programs[0]
  unenrolled.enrolled = false
  const selectedEnrollment = programs[1]

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderProgramSelector = props => {
    return shallow(
      <ProgramSelector
        programs={programs}
        currentProgramEnrollment={selectedEnrollment}
        {...props}
      />
    )
  }

  it("renders an empty div if there are no program enrollments", () => {
    const wrapper = renderProgramSelector({
      programs: []
    })
    assert.lengthOf(wrapper.find("div").children(), 0)
  })

  it("renders an empty div if it is passed `selectorVisibility === false`", () => {
    const wrapper = renderProgramSelector({ selectorVisibility: false })
    assert.lengthOf(wrapper.find("div").children(), 0)
  })

  it("renders the currently selected enrollment first, then all other enrollments", () => {
    const wrapper = renderProgramSelector()
    const selectProps = wrapper.find(Select).props()

    const enrollments = programs.filter(program => program.enrolled)
    const sortedEnrollments = _.sortBy(enrollments, "title")
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, enrollments)

    const options = selectProps["options"]
    // include 'Enroll in a new program' which comes at the end if user can enroll in a new program
    const expectedEnrollments = sortedEnrollments
      .filter(program => program.id !== selectedEnrollment.id)
      .map(program => ({
        label: program.title,
        value: program.id
      }))
      .concat({
        label: "Enroll in a new program",
        value: "enroll"
      })
    assert.deepEqual(options, expectedEnrollments)
  })

  it("does not render the 'Enroll in a new program' option if there is not at least one available program", () => {
    const allEnrollments = programs.map(program => ({
      ...program,
      enrolled: true
    }))
    const wrapper = renderProgramSelector({
      programs: allEnrollments
    })
    const selectProps = wrapper.find(Select).props()
    const sortedEnrollments = _.sortBy(allEnrollments, "title")
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, allEnrollments)

    const options = selectProps["options"]
    // include 'Enroll in a new program' which comes at the end if user can enroll in a new program
    const expectedEnrollments = sortedEnrollments
      .filter(program => program.id !== selectedEnrollment.id)
      .map(program => ({
        label: program.title,
        value: program.id
      }))
    assert.deepEqual(options, expectedEnrollments)
  })

  it("shows the enrollment dialog when the 'Enroll in a new program' option is clicked", () => {
    const setEnrollDialogVisibility = sandbox.stub()
    const setEnrollDialogError = sandbox.stub()
    const setEnrollSelectedProgram = sandbox.stub()
    const wrapper = renderProgramSelector({
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram
    })
    const onChange = wrapper.find(Select).props()["onChange"]
    onChange({ value: "enroll" })
    assert(setEnrollDialogVisibility.calledWith(true))
    assert(setEnrollDialogError.calledWith(null))
    assert(setEnrollSelectedProgram.calledWith(null))
  })

  it("switches to a new current enrollment when a new option is clicked", () => {
    const setCurrentProgramEnrollment = sandbox.stub()

    const wrapper = renderProgramSelector({
      setCurrentProgramEnrollment
    })
    const onChange = wrapper.find(Select).props()["onChange"]
    onChange({ value: unenrolled.id })
    assert(setCurrentProgramEnrollment.calledWith(unenrolled))
  })
})

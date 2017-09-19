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

  let renderProgramSelector = props => {
    return shallow(
      <ProgramSelector
        programs={programs}
        currentProgramEnrollment={selectedEnrollment}
        {...props}
      />
    )
  }

  it("renders an empty div if there are no program enrollments", () => {
    let wrapper = renderProgramSelector({
      programs: []
    })
    assert.lengthOf(wrapper.find("div").children(), 0)
  })

  it("renders an empty div if it is passed `selectorVisibility === false`", () => {
    let wrapper = renderProgramSelector({ selectorVisibility: false })
    assert.lengthOf(wrapper.find("div").children(), 0)
  })

  it("renders the currently selected enrollment first, then all other enrollments", () => {
    let wrapper = renderProgramSelector()
    let selectProps = wrapper.find(Select).props()

    let enrollments = programs.filter(program => program.enrolled)
    let sortedEnrollments = _.sortBy(enrollments, "title")
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, enrollments)

    let options = selectProps["options"]
    // include 'Enroll in a new program' which comes at the end if user can enroll in a new program
    let expectedEnrollments = sortedEnrollments
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
    let allEnrollments = programs.map(program => ({
      ...program,
      enrolled: true
    }))
    let wrapper = renderProgramSelector({
      programs: allEnrollments
    })
    let selectProps = wrapper.find(Select).props()
    let sortedEnrollments = _.sortBy(allEnrollments, "title")
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, allEnrollments)

    let options = selectProps["options"]
    // include 'Enroll in a new program' which comes at the end if user can enroll in a new program
    let expectedEnrollments = sortedEnrollments
      .filter(program => program.id !== selectedEnrollment.id)
      .map(program => ({
        label: program.title,
        value: program.id
      }))
    assert.deepEqual(options, expectedEnrollments)
  })

  it("shows the enrollment dialog when the 'Enroll in a new program' option is clicked", () => {
    let setEnrollDialogVisibility = sandbox.stub()
    let setEnrollDialogError = sandbox.stub()
    let setEnrollSelectedProgram = sandbox.stub()
    let wrapper = renderProgramSelector({
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram
    })
    let onChange = wrapper.find(Select).props()["onChange"]
    onChange({ value: "enroll" })
    assert(setEnrollDialogVisibility.calledWith(true))
    assert(setEnrollDialogError.calledWith(null))
    assert(setEnrollSelectedProgram.calledWith(null))
  })

  it("switches to a new current enrollment when a new option is clicked", () => {
    let setCurrentProgramEnrollment = sandbox.stub()

    let wrapper = renderProgramSelector({
      setCurrentProgramEnrollment
    })
    let onChange = wrapper.find(Select).props()["onChange"]
    onChange({ value: unenrolled.id })
    assert(setCurrentProgramEnrollment.calledWith(unenrolled))
  })
})

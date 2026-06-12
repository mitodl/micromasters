// @flow
import { assert } from "chai"

import { dialogActions } from "./util"

describe("input functions", () => {
  describe("dialogActions", () => {
    const onCancel = () => null
    const onSave = () => null
    const inFlight = true
    const newClass = "new-class"
    const newText = "New Text"

    it("renders properly", () => {
      const actions = dialogActions(
        onCancel,
        onSave,
        inFlight,
        newText,
        newClass
      )
      assert.lengthOf(actions, 2)
      const [cancelButton, saveButton] = actions
      assert.equal(
        cancelButton.props.className,
        "secondary-button cancel-button"
      )
      assert.equal(cancelButton.props.onClick, onCancel)
      assert.equal(cancelButton.props.children, "Cancel")

      assert.equal(
        saveButton.props.className,
        `primary-button save-button ${newClass}`
      )
      assert.equal(saveButton.props.onClick, onSave)
      assert.equal(saveButton.props.children, newText)
      assert.equal(saveButton.props.spinning, inFlight)
      assert.equal(saveButton.type.name, "SpinnerButton")
    })

    it("uses secondary-button if it's disabled", () => {
      const actions = dialogActions(
        onCancel,
        onSave,
        inFlight,
        newText,
        newClass,
        true
      )
      assert.lengthOf(actions, 2)
      const [cancelButton, saveButton] = actions
      assert.equal(
        cancelButton.props.className,
        "secondary-button cancel-button"
      )
      assert.equal(cancelButton.props.onClick, onCancel)
      assert.equal(cancelButton.props.children, "Cancel")

      assert.equal(
        saveButton.props.className,
        `secondary-button save-button ${newClass}`
      )
      assert.equal(saveButton.props.onClick, onSave)
      assert.equal(saveButton.props.children, newText)
      assert.equal(saveButton.props.spinning, inFlight)
      assert.equal(saveButton.type.name, "SpinnerButton")
    })
  })
})

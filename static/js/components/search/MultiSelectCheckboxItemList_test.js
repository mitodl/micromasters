/* global SETTINGS: false */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"

import MultiSelectCheckboxItemList from "./MultiSelectCheckboxItemList"

describe("MultiSelectCheckboxItemList", () => {
  const setItemsStub = sinon.stub()
  const countFormatterStub = sinon.stub()
  const items = [
    {
      label:     "Item 1",
      key:       "item_1",
      doc_count: 5
    },
    {
      label:     "Item 2",
      key:       "item_2",
      doc_count: 4
    }
  ]
  const props = {
    mod:            "sk-item-list",
    disabled:       false,
    className:      "test",
    countFormatter: countFormatterStub,
    setItems:       setItemsStub,
    items:          items
  }

  afterEach(() => {
    setItemsStub.reset()
    countFormatterStub.reset()
  })

  const renderList = (props = {}) =>
    shallow(<MultiSelectCheckboxItemList {...props} />)

  it("renders select all", () => {
    const wrapper = renderList(props)
    const selectAllBox = wrapper.find(".sk-item-list-option__text").childAt(0)
    assert.equal(selectAllBox.text(), "Select All")
    assert(countFormatterStub.called, "count wasn't rendered")
  })

  it("should call setItems", () => {
    const wrapper = renderList(props)
    const selectAllBox = wrapper.find(".checkbox")
    const event = { target: { name: "click", checked: true } }
    selectAllBox.simulate("change", event)
    assert(setItemsStub.called, "items are selected")
  })

  it("render items", () => {
    const wrapper = renderList(props)
    const options = wrapper.find(".sk-item-list").children()
    assert.equal(options.length, items.length + 1) // 2 items and select all box
  })
})

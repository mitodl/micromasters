/* global SETTINGS: false */
import React from "react"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import { SearchkitManager, SearchkitProvider } from "searchkit"

import MultiSelectCheckboxItemList from "./MultiSelectCheckboxItemList"

describe("MultiSelectCheckboxItemList", () => {
  let searchKit
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
    mod:         "sk-item-list",
    disabled:    false,
    className:   "test",
    setItems:    sinon.stub(),
    items:       items,
    toggleItem:  sinon.stub(),
    translate:   sinon.stub(),
    multiselect: true
  }

  beforeEach(() => {
    searchKit = new SearchkitManager()
  })

  afterEach(() => {
    props.setItems.reset()
    props.toggleItem.reset()
    props.translate.reset()
  })

  const renderList = (props = {}) =>
    mount(
      <SearchkitProvider searchkit={searchKit}>
        <MultiSelectCheckboxItemList {...props} />
      </SearchkitProvider>
    )

  it("renders select all", () => {
    const wrapper = renderList(props)
    const selectAllBox = wrapper.find(".facet-text").first()
    assert.equal(selectAllBox.text(), "Select All")
    assert(props.translate.called, "translate not called")
  })

  it("should call setItems", () => {
    const wrapper = renderList(props)
    const selectAllBox = wrapper.find(".sk-item-list__item").first()
    selectAllBox.simulate("click")
    assert(props.setItems.called, "items are selected")
  })

  it("should call toggleItem", () => {
    const wrapper = renderList(props)
    const selectAllBox = wrapper.find(".sk-item-list__item").last()
    selectAllBox.simulate("click")
    assert(props.toggleItem.called, "toggleItem not called")
  })

  it("render items", () => {
    const wrapper = renderList(props)
    const options = wrapper.find(".sk-item-list").children()
    assert.equal(options.length, items.length + 1) // 2 items and select all box
  })

  it("render count", () => {
    const wrapper = renderList(props)
    const count = wrapper.find(".sk-item-list-option__count").last()
    assert.equal(count.text(), "4")
  })
})

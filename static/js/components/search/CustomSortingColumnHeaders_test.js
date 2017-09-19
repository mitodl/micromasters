/* global SETTINGS: false */
import React from "react"
import { Provider } from "react-redux"
import { mount } from "enzyme"
import { assert } from "chai"

import { PROGRAMS } from "../../test_constants"
import { receiveGetProgramEnrollmentsSuccess } from "../../actions/programs"
import CustomSortingColumnHeaders from "./CustomSortingColumnHeaders"
import { sortOptions } from "../../components/LearnerSearch"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("CustomSortingSelect", () => {
  let setItemsStub, helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    setItemsStub = helper.sandbox.stub()
    helper.store.dispatch(receiveGetProgramEnrollmentsSuccess(PROGRAMS))
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderSelect = (props = {}) => {
    return mount(
      <Provider store={helper.store}>
        <CustomSortingColumnHeaders
          items={sortOptions}
          setItems={setItemsStub}
          selectedItems={null}
          {...props}
        />
      </Provider>
    )
  }

  describe("column sorting", () => {
    for (const [key, description, arrow] of [
      ["name_a_z", "Name", "▲"],
      ["name_z_a", "Name", "▼"],
      ["loc-a-z", "Residence", "▲"],
      ["loc-z-a", "Residence", "▼"],
      ["grade-high-low", "Program grade", "▼"],
      ["grade-low-high", "Program grade", "▲"],
      ["other", "Program grade", ""]
    ]) {
      it(`should display '${description} ${arrow}' when sort is '${key}'`, () => {
        SETTINGS.roles = [
          {
            role:        "staff",
            program:     PROGRAMS[0].id,
            permissions: ["can_advance_search"]
          }
        ]
        let wrapper = renderSelect({
          selectedItems: [key]
        })
        let lookup = {
          Name:            wrapper.find(".name"),
          Residence:       wrapper.find(".residence"),
          "Program grade": wrapper.find(".grade")
        }
        assert.equal(lookup[description].text(), `${description} ${arrow}`)

        // assert that it's only selected when it needs to be
        assert.equal(
          lookup[description].props()["className"].includes("selected"),
          Boolean(arrow)
        )
      })
    }
  })

  it("should not show the grade column to learners", () => {
    let wrapper = renderSelect()
    SETTINGS.roles = []
    assert.isFalse(wrapper.find(".grade").exists())
  })

  it("chooses the first sorting key when the column is clicked", () => {
    let wrapper = renderSelect()
    wrapper.find(".name").simulate("click")
    assert.isTrue(setItemsStub.calledWith(["name_a_z"]))
  })

  it("chooses the second sorting key if the first sorting key is already selected", () => {
    let wrapper = renderSelect({
      selectedItems: ["name_a_z"]
    })
    wrapper.find(".name").simulate("click")
    assert.isTrue(setItemsStub.calledWith(["name_z_a"]))
  })
})

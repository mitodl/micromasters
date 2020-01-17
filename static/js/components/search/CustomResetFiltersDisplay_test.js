// @flow
import React from "react"
import { mount } from "enzyme"
import sinon from "sinon"
import { assert } from "chai"
import { SearchkitManager, SearchkitProvider } from "searchkit"
import axios from "axios"
import MockAdapter from "axios-mock-adapter"

import CustomResetFiltersDisplay from "./CustomResetFiltersDisplay"
import { ELASTICSEARCH_RESPONSE } from "../../test_constants"

describe("CustomResetFiltersDisplay", () => {
  let sandbox, searchKit, mockAxios

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    mockAxios = new MockAdapter(axios)

    const replySpy = sandbox
      .stub()
      .returns(Promise.resolve([200, ELASTICSEARCH_RESPONSE]))
    mockAxios.onPost("/_search").reply(replySpy)

    searchKit = new SearchkitManager()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderFilters = (props = {}) =>
    mount(
      <SearchkitProvider searchkit={searchKit}>
        <CustomResetFiltersDisplay
          clearAllLabel="Clear all filters"
          hasFilters={true}
          resetFilters={() => {}}
          bemBlock={() => ({ state: () => {} })}
          {...props}
        />
      </SearchkitProvider>
    )

  it("renders reset filters link", () => {
    sandbox.stub(CustomResetFiltersDisplay.prototype, "getQuery").returns({
      index: {
        filters: ["program filter", "any other filter"]
      }
    })
    const wrapper = renderFilters()
    assert.equal(
      wrapper
        .children()
        .children()
        .text(),
      "Clear all filters"
    )
  })

  it("reset filter link does not render when hasFilters is false", () => {
    sandbox.stub(CustomResetFiltersDisplay.prototype, "getQuery").returns({
      index: {
        filters: ["program filter", "any other filter"]
      }
    })
    const wrapper = renderFilters({
      hasFilters: false
    })

    assert.lengthOf(wrapper.children().children(), 0)
  })

  it("do not render when there is only program filter selected", () => {
    sandbox.stub(CustomResetFiltersDisplay.prototype, "getQuery").returns({
      index: {
        filters: ["program filter"]
      }
    })
    const wrapper = renderFilters()
    assert.lengthOf(wrapper.children().children(), 0)
  })
})

// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import EmploymentForm from "./EmploymentForm"
import { USER_PROFILE_RESPONSE } from "../test_constants"
import { labelSort } from "../util/util"

describe("EmploymentForm", () => {
  const renderEmploymentForm = (props = {}) => {
    return shallow(
      <EmploymentForm
        ui={{
          workDialogVisibility: true
        }}
        profile={USER_PROFILE_RESPONSE}
        {...props}
      />,
      {
        context: {
          router: {}
        }
      }
    )
  }

  it("sorts the industries in order", () => {
    const wrapper = renderEmploymentForm()
    const field = wrapper
      .find("SelectField")
      .filterWhere(field => field.props().label === "Industry")
    const options = field.props().options
    assert.deepEqual(options, labelSort(options))
  })
})

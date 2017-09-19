// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import EmploymentForm from "./EmploymentForm"
import { USER_PROFILE_RESPONSE } from "../test_constants"
import { labelSort } from "../util/util"

describe("EmploymentForm", () => {
  let renderEmploymentForm = (props = {}) => {
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
    let wrapper = renderEmploymentForm()
    let field = wrapper
      .find("SelectField")
      .filterWhere(field => field.props().label === "Industry")
    let options = field.props().options
    assert.deepEqual(options, labelSort(options))
  })
})

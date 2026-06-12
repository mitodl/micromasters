// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import EducationForm from "./EducationForm"
import { USER_PROFILE_RESPONSE } from "../test_constants"
import { labelSort } from "../util/util"

describe("EducationForm", () => {
  const renderEducationForm = (props = {}) => {
    return shallow(
      <EducationForm
        ui={{
          educationDialogVisibility: true
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

  it("sorts the fields of study in order", () => {
    const wrapper = renderEducationForm()
    const field = wrapper
      .find("SelectField")
      .filterWhere(field => field.props().label === "Field of Study")
    const options = field.props().options
    assert.deepEqual(options, labelSort(options))
  })
})

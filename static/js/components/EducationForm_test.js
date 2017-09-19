// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import EducationForm from "./EducationForm"
import { USER_PROFILE_RESPONSE } from "../test_constants"
import { labelSort } from "../util/util"

describe("EducationForm", () => {
  let renderEducationForm = (props = {}) => {
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
    let wrapper = renderEducationForm()
    let field = wrapper
      .find("SelectField")
      .filterWhere(field => field.props().label === "Field of Study")
    let options = field.props().options
    assert.deepEqual(options, labelSort(options))
  })
})

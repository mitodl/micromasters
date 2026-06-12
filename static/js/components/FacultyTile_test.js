import { assert } from "chai"
import { shallow } from "enzyme"
import React from "react"

import FacultyTile from "./FacultyTile"

describe("FacultyTile", () => {
  const renderFacultyTile = props => {
    return shallow(
      <FacultyTile
        name="Frank Professor"
        title="Ph.D"
        short_bio="He does things."
        image={{
          alt:       "An impressive image",
          rendition: {
            width:  "50",
            height: "50",
            file:   "frank.jpg"
          }
        }}
        {...props}
      />
    )
  }

  it("can render itself", () => {
    const wrapper = renderFacultyTile()
    const nameEl = wrapper.find(".faculty-name")
    assert.lengthOf(nameEl, 1)
    assert.equal(nameEl.text(), "Frank Professor, Ph.D")
    const bioEl = wrapper.find(".faculty-bio")
    assert.lengthOf(bioEl, 1)
    assert.equal(bioEl.text(), "He does things.")
    const imgEl = wrapper.find("img")
    assert.lengthOf(imgEl, 1)
    const imgElProps = imgEl.props()
    assert.propertyVal(imgElProps, "src", "frank.jpg")
    assert.propertyVal(imgElProps, "alt", "An impressive image")
  })

  it("can render without an image", () => {
    const wrapper = renderFacultyTile({ image: null })
    const nameEl = wrapper.find(".faculty-name")
    assert.lengthOf(nameEl, 1)
    assert.equal(nameEl.text(), "Frank Professor, Ph.D")
    const bioEl = wrapper.find(".faculty-bio")
    assert.lengthOf(bioEl, 1)
    assert.equal(bioEl.text(), "He does things.")
    const imgEl = wrapper.find("img")
    assert.lengthOf(imgEl, 0)
  })
})

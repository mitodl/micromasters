import { assert } from "chai"

import { generateSSOForm, staticFormEntries, createFormInput } from "./pearson"

describe("pearson library", () => {
  describe("createFormInput", () => {
    it("returns an input, given a form, name, and value", () => {
      let form = document.createElement("form")
      document.body.appendChild(form)
      createFormInput(form, ["foo", "bar"])
      let input = form.querySelector("input")
      assert.equal(input.name, "foo")
      assert.equal(input.type, "hidden")
      assert.equal(input.value, "bar")
    })
  })

  describe("generateSSOForm", () => {
    const timestamp = Math.round(new Date().getTime() / 1000)
    const hex =
      "c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
    let form, inputs

    beforeEach(() => {
      form = generateSSOForm(
        12,
        timestamp,
        timestamp + 1000,
        hex,
        "http://foo.bar/"
      )
      inputs = [...form.querySelectorAll("input")].map(el => [
        el.name,
        el.value
      ])
    })

    const checkInputs = entriesToFind => {
      entriesToFind.forEach(([k1, v1]) => {
        assert.notEqual(-1, inputs.find(([k2, v2]) => k1 === k2 && v1 === v2))
      })
    }

    it("should accept arguments and return a form", () => {
      assert(form.nodeName === "FORM")
    })

    it("should contain all the static form entries", () => {
      checkInputs(staticFormEntries)
    })

    it("should contain all the values it was passed", () => {
      checkInputs(
        ["CLIENT_CANDIDATE_ID", String(12)],
        ["EXTERNAL_PAGE_TIMESTAMP", String(timestamp)],
        ["EXTERNAL_SESSION_TIMEOUT", String(timestamp + 1000)],
        ["EXTERNAL_AUTH_HASH", hex],
        ["EXTERNAL_ERROR_URL", "http://foo.bar/pearson/error"],
        ["EXTERNAL_LOGOUT_URL", "http://foo.bar/pearson/logout"],
        ["EXTERNAL_RETURN_URL", "http://foo.bar/pearson/success"],
        ["EXTERNAL_TIMEOUT_URL", "http://foo.bar/pearson/timeout"]
      )
    })
  })
})

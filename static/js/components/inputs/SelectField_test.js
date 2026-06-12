import { assert } from "chai"

import { CREATE_OPTION_REGEX } from "./SelectField"

describe("SelectField", () => {
  describe("CREATE_OPTION_REGEX", () => {
    [
      'Create option ""',
      'Create option "test"',
      'Create option "My new option"',
      'Create option "..asdf anything at all!!!! "'
    ].forEach(string => {
      it(`should match ${string}`, () => {
        assert.match(string, CREATE_OPTION_REGEX)
      })
    })
    ;["Crete option", "Some other option with nothing in common", ""].forEach(
      string => {
        it(`should not match ${string}`, () => {
          assert.notMatch(string, CREATE_OPTION_REGEX)
        })
      }
    )
  })
})

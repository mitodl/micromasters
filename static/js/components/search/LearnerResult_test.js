// @flow
/* global SETTINGS: false */
import _ from "lodash"
import React from "react"
import R from "ramda"
import { Provider } from "react-redux"
import { assert } from "chai"
import { mount } from "enzyme"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import { SearchkitManager, SearchkitProvider } from "searchkit"

import ProfileImage from "../../containers/ProfileImage"
import LearnerResult from "./LearnerResult"
import IntegrationTestHelper from "../../util/integration_test_helper"
import { getPreferredName } from "../../util/util"
import {
  USER_PROFILE_RESPONSE,
  USER_PROGRAM_RESPONSE,
  ELASTICSEARCH_RESPONSE
} from "../../test_constants"
import { codeToCountryName } from "../../lib/location"

describe("LearnerResult", () => {
  let helper
  const resultData = {
    _source: {
      profile: USER_PROFILE_RESPONSE,
      program: USER_PROGRAM_RESPONSE
    }
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })
  afterEach(() => {
    helper.cleanup()
  })

  const renderElasticSearchResult = (result, props = {}) => {
    const manager = new SearchkitManager()
    manager.state = {
      q: "query"
    }
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <Provider store={helper.store}>
          <SearchkitProvider searchkit={manager}>
            <LearnerResult
              result={result}
              openLearnerEmailComposer={
                props.openLearnerEmailComposer || helper.sandbox.stub()
              }
              {...props}
            />
          </SearchkitProvider>
        </Provider>
      </MuiThemeProvider>
    )
  }

  const renderLearnerResult = (props = {}) =>
    renderElasticSearchResult(resultData, props)

  it("should include the user's preferred name", () => {
    const result = renderLearnerResult()
      .find(".learner-name")
      .find(".display-name")
    assert.equal(result.text(), getPreferredName(USER_PROFILE_RESPONSE))
  })

  it("should include the username", () => {
    const result = renderLearnerResult()
      .find(".learner-name")
      .find(".user-name")
    assert.equal(result.text(), USER_PROFILE_RESPONSE.username)
  })

  it("should render profile link", () => {
    const href = renderLearnerResult()
      .find(".learner-name")
      .find(".display-name")
      .find("a")
      .at(0)
      .props().href
    assert.equal(href, `/learner/${USER_PROFILE_RESPONSE.username}`)
  })

  it("should include the user's location for US residence", () => {
    const result = renderLearnerResult()
      .find(".learner-location")
      .find("span")
    assert.include(result.text(), USER_PROFILE_RESPONSE.city)
    assert.include(result.text(), USER_PROFILE_RESPONSE.country)
    assert.include(result.text(), USER_PROFILE_RESPONSE.state_or_territory)
  })

  it("should include the user's location for non US residence", () => {
    const profile = R.clone(USER_PROFILE_RESPONSE)
    profile["country"] = "PK"
    const searchResults = renderElasticSearchResult(
      {
        _source: {
          profile: profile,
          program: USER_PROGRAM_RESPONSE
        }
      },
      {}
    )
    const result = searchResults.find(".learner-location").find("span")
    assert.include(result.text(), profile.city)
    assert.include(result.text(), codeToCountryName(profile.country))
    assert.notInclude(result.text(), profile.state_or_territory)
  })

  it("should include the user's current program grade when a grade is available", () => {
    SETTINGS.roles = [
      {
        role:        "staff",
        program:     1,
        permissions: ["can_advance_search"]
      }
    ]
    const result = renderLearnerResult().find(".learner-grade .percent")
    assert.include(result.text(), `${USER_PROGRAM_RESPONSE.grade_average}%`)
  })

  it("should not include the user's current program grade if the searching user is not staff", () => {
    SETTINGS.roles = []
    assert.isFalse(
      renderLearnerResult()
        .find(".learner-grade .percent")
        .exists()
    )
  })

  it("should show an indicator when a user has a missing/null program grade", () => {
    SETTINGS.roles = [
      {
        role:        "staff",
        program:     1,
        permissions: ["can_advance_search"]
      }
    ]
    const emptyGradeElasticHit = {
      _source: {
        profile: USER_PROFILE_RESPONSE,
        program: {
          ...USER_PROGRAM_RESPONSE,
          grade_average: null
        }
      }
    }
    let result = renderLearnerResult({ result: emptyGradeElasticHit }).find(
      ".learner-grade .percent"
    )
    assert.equal(result.text(), "-")
    delete emptyGradeElasticHit._source.program.grade_average
    result = renderLearnerResult({ result: emptyGradeElasticHit }).find(
      ".learner-grade .percent"
    )
    assert.equal(result.text(), "-")
  })

  it("should use the small avatar", () => {
    const result = renderLearnerResult()
    assert.isTrue(
      result
        .find(".learner-avatar")
        .find(ProfileImage)
        .props().useSmall
    )
  })

  for (const [index, profile] of ELASTICSEARCH_RESPONSE.hits.hits.entries()) {
    it(`should render without error with ES profile result at index ${index}`, () => {
      const esResult = _.cloneDeep(profile)
      esResult["program"] = USER_PROGRAM_RESPONSE
      assert.doesNotThrow(() => {
        renderElasticSearchResult(esResult)
      })
    })
  }

  it("should highlight the text in the result", () => {
    const profile = Object.assign({}, USER_PROFILE_RESPONSE)
    profile.first_name = "queryname"
    profile.last_name = "qÜeryson"
    profile.preferred_name = "Querypreferred"
    profile.username = "queryfake.username"
    const result = renderElasticSearchResult({
      _source: {
        profile: profile,
        program: USER_PROGRAM_RESPONSE
      }
    })
    assert.deepEqual(
      result.find(".display-name .highlight").map(node => node.text()),
      ["Query"]
    )
    assert.equal(result.find(".user-name .highlight").text(), "query")
  })
})

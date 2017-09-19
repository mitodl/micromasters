// @flow
/* global SETTINGS: false */
import _ from "lodash"
import React from "react"
import R from "ramda"
import { Provider } from "react-redux"
import sinon from "sinon"
import { assert } from "chai"
import { mount } from "enzyme"
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider"
import getMuiTheme from "material-ui/styles/getMuiTheme"
import { SearchkitManager, SearchkitProvider } from "searchkit"

import ProfileImage from "../../containers/ProfileImage"
import LearnerResult from "./LearnerResult"
import {
  SET_LEARNER_CHIP_VISIBILITY,
  setLearnerChipVisibility
} from "../../actions/ui"
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
  let resultData = {
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

  let renderElasticSearchResult = (result, props = {}) => {
    const manager = new SearchkitManager()
    manager.state = {
      q: "query"
    }
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
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

  let renderLearnerResult = (props = {}) =>
    renderElasticSearchResult(resultData, props)

  it("should include the user's preferred name", () => {
    let result = renderLearnerResult()
      .find(".learner-name")
      .find(".display-name")
    assert.equal(result.text(), getPreferredName(USER_PROFILE_RESPONSE))
  })

  it("should include the username", () => {
    let result = renderLearnerResult()
      .find(".learner-name")
      .find(".user-name")
    assert.equal(result.text(), USER_PROFILE_RESPONSE.username)
  })

  it("should include the user's location for US residence", () => {
    let result = renderLearnerResult()
      .find(".learner-location")
      .find("span")
    assert.include(result.text(), USER_PROFILE_RESPONSE.city)
    assert.include(result.text(), USER_PROFILE_RESPONSE.country)
    assert.include(result.text(), USER_PROFILE_RESPONSE.state_or_territory)
  })

  it("should include the user's location for non US residence", () => {
    let profile = R.clone(USER_PROFILE_RESPONSE)
    profile["country"] = "PK"
    let searchResults = renderElasticSearchResult(
      {
        _source: {
          profile: profile,
          program: USER_PROGRAM_RESPONSE
        }
      },
      {}
    )
    let result = searchResults.find(".learner-location").find("span")
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
    let result = renderLearnerResult().find(".learner-grade .percent")
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
    let emptyGradeElasticHit = {
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
    let result = renderLearnerResult()
    assert.isTrue(
      result
        .find(".learner-avatar")
        .find(ProfileImage)
        .props().useSmall
    )
  })

  it("should render the user chip if the visibility equals the username", () => {
    helper.store.dispatch(
      setLearnerChipVisibility(USER_PROFILE_RESPONSE.username)
    )

    let result = renderLearnerResult()
    assert.equal(result.find(".user-chip").length, 1)
  })

  for (const username of ["xyz", null]) {
    it(`should not render the user chip if visibility is set to ${String(
      username
    )}`, () => {
      helper.store.dispatch(setLearnerChipVisibility(username))

      let result = renderLearnerResult()
      assert.equal(result.find(".user-chip").length, 0)
    })
  }

  it("should set user chip visibility if onMouseEnter is triggered", () => {
    let result = renderLearnerResult()
    return helper
      .listenForActions([SET_LEARNER_CHIP_VISIBILITY], () => {
        result
          .find(".learner-name")
          .props()
          .onMouseEnter()
      })
      .then(state => {
        assert.equal(
          state.ui.learnerChipVisibility,
          USER_PROFILE_RESPONSE.username
        )
      })
  })

  it("should clear user chip visibility if onMouseLeave is triggered", () => {
    helper.store.dispatch(
      setLearnerChipVisibility(USER_PROFILE_RESPONSE.username)
    )
    let result = renderLearnerResult()
    return helper
      .listenForActions([SET_LEARNER_CHIP_VISIBILITY], () => {
        result
          .find(".learner-name")
          .props()
          .onMouseLeave()
      })
      .then(state => {
        assert.equal(state.ui.learnerChipVisibility, null)
      })
  })

  it("should pass down a function that can open a dialog to email a learner", () => {
    helper.store.dispatch(
      setLearnerChipVisibility(USER_PROFILE_RESPONSE.username)
    )
    let openLearnerEmailComposerStub = helper.sandbox.stub()

    let result = renderLearnerResult({
      openLearnerEmailComposer: openLearnerEmailComposerStub
    })
    return helper
      .listenForActions([SET_LEARNER_CHIP_VISIBILITY], () => {
        result
          .find(".learner-name")
          .props()
          .onMouseEnter()
      })
      .then(() => {
        const chip = result.find("LearnerChip")
        assert.lengthOf(chip, 1)
        // Execute the openLearnerEmailComposer function passed down to the LearnerChip
        chip.props().openLearnerEmailComposer()
        sinon.assert.called(openLearnerEmailComposerStub)
        sinon.assert.calledWith(
          openLearnerEmailComposerStub,
          USER_PROFILE_RESPONSE
        )
      })
  })

  for (const [index, profile] of ELASTICSEARCH_RESPONSE.hits.hits.entries()) {
    it(`should render without error with ES profile result at index ${index}`, () => {
      let esResult = _.cloneDeep(profile)
      esResult["program"] = USER_PROGRAM_RESPONSE
      assert.doesNotThrow(() => {
        renderElasticSearchResult(esResult)
      })
    })
  }

  it("should highlight the text in the result", () => {
    let profile = Object.assign({}, USER_PROFILE_RESPONSE)
    profile.first_name = "queryname"
    profile.last_name = "qÜeryson"
    profile.preferred_name = "Querypreferred"
    profile.username = "queryfake.username"
    let result = renderElasticSearchResult({
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

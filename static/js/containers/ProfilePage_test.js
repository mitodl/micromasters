/* global SETTINGS: false */

import ReactTestUtils from "react-dom/test-utils"
import { assert } from "chai"
import _ from "lodash"

import {
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS
} from "../actions/programs"
import {
  requestGetUserProfile,
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
  requestPatchUserProfile,
  REQUEST_PATCH_USER_PROFILE,
  RECEIVE_PATCH_USER_PROFILE_SUCCESS,
  START_PROFILE_EDIT,
  UPDATE_PROFILE_VALIDATION,
  UPDATE_VALIDATION_VISIBILITY,
  CLEAR_PROFILE_EDIT
} from "../actions/profile"
import {
  setProgram,
  SET_PROFILE_STEP,
  SET_TOAST_MESSAGE,
  SET_PROGRAM
} from "../actions/ui"
import { USER_PROFILE_RESPONSE, PROGRAMS } from "../test_constants"
import { PERSONAL_STEP, EDUCATION_STEP, EMPLOYMENT_STEP } from "../constants"
import IntegrationTestHelper from "../util/integration_test_helper"
import * as api from "../lib/api"
import { activeDialog } from "../util/test_utils"

describe("ProfilePage", function() {
  this.timeout(5000) // eslint-disable-line no-invalid-this

  let listenForActions, renderComponent, helper
  let addProgramEnrollmentStub, patchUserProfileStub

  const profileSteps = [PERSONAL_STEP, EDUCATION_STEP, EMPLOYMENT_STEP]
  const prevButtonSelector = ".prev"
  const nextButtonSelector = ".next"

  const SUCCESS_ACTIONS = [
    REQUEST_GET_USER_PROFILE,
    RECEIVE_GET_USER_PROFILE_SUCCESS,
    REQUEST_GET_PROGRAM_ENROLLMENTS,
    RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
    START_PROFILE_EDIT,
    SET_PROFILE_STEP
  ]

  const SUCCESS_SET_PROGRAM_ACTIONS = SUCCESS_ACTIONS.concat(SET_PROGRAM)

  const REDIRECT_ACTIONS = SUCCESS_ACTIONS.concat([SET_PROFILE_STEP])

  const getStep = () => helper.store.getState().ui.profileStep

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listenForActions = helper.listenForActions.bind(helper)
    renderComponent = helper.renderComponent.bind(helper)
    patchUserProfileStub = helper.sandbox.stub(api, "patchUserProfile")
    addProgramEnrollmentStub = helper.sandbox.stub(api, "addProgramEnrollment")
    addProgramEnrollmentStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  const confirmSaveButtonBehavior = (
    updatedProfile,
    pageElements,
    additionalActions = []
  ) => {
    let { button } = pageElements
    const { div } = pageElements
    button = button || div.querySelector(nextButtonSelector)
    patchUserProfileStub.throws("Invalid arguments")
    patchUserProfileStub
      .withArgs(SETTINGS.user.username, updatedProfile)
      .returns(Promise.resolve(updatedProfile))

    const actions = [
      UPDATE_PROFILE_VALIDATION,
      UPDATE_VALIDATION_VISIBILITY,
      REQUEST_PATCH_USER_PROFILE,
      RECEIVE_PATCH_USER_PROFILE_SUCCESS,
      CLEAR_PROFILE_EDIT,
      SET_PROFILE_STEP
    ].concat(additionalActions)

    return listenForActions(actions, () => {
      ReactTestUtils.Simulate.click(button)
    })
  }

  const radioToggles = (div, selector) =>
    div.querySelector(selector).getElementsByTagName("input")

  describe("switch toggling behavior", () => {
    beforeEach(() => {
      const userProfile = {
        ...USER_PROFILE_RESPONSE,
        education:    [],
        work_history: []
      }
      helper.profileGetStub
        .withArgs(SETTINGS.user.username)
        .returns(Promise.resolve(userProfile))
    })

    it("should launch a dialog to add an entry when an education switch is set to Yes", () => {
      const dialogTest = ([, div]) => {
        const toggle = radioToggles(div, ".profile-radio-group")
        ReactTestUtils.Simulate.change(toggle[0])
        activeDialog("education-dialog-wrapper")
      }
      return renderComponent("/profile/education", SUCCESS_ACTIONS).then(
        dialogTest
      )
    })

    it("should launch a dialog to add an entry when an employment switch is set to Yes", () => {
      const dialogTest = ([, div]) => {
        const toggle = radioToggles(div, ".profile-radio-group")
        ReactTestUtils.Simulate.change(toggle[0])
        activeDialog("employment-dialog-wrapper")
      }
      return renderComponent("/profile/professional", SUCCESS_ACTIONS).then(
        dialogTest
      )
    })
  })

  describe("profile completeness", () => {
    it("redirects to /profile/personal if profile is not complete", () => {
      const response = {
        ...USER_PROFILE_RESPONSE,
        first_name: undefined
      }
      helper.profileGetStub
        .withArgs(SETTINGS.user.username)
        .returns(Promise.resolve(response))

      return renderComponent(
        "/profile/education",
        REDIRECT_ACTIONS.concat(SET_PROGRAM)
      ).then(() => {
        assert.equal(window.location.pathname, "/profile/personal")
        assert.equal(getStep(), PERSONAL_STEP)
      })
    })

    it("redirects to /profile/education if a field is missing there", () => {
      const response = _.cloneDeep(USER_PROFILE_RESPONSE)
      response.education[0].school_name = ""
      helper.profileGetStub
        .withArgs(SETTINGS.user.username)
        .returns(Promise.resolve(response))

      return renderComponent("/profile/professional", REDIRECT_ACTIONS).then(
        () => {
          assert.equal(window.location.pathname, "/profile/education")
          assert.equal(getStep(), EDUCATION_STEP)
        }
      )
    })
  })

  it("navigates backward when Previous button is clicked", () => {
    return renderComponent("/profile/education", SUCCESS_ACTIONS).then(
      ([, div]) => {
        const button = div.querySelector(prevButtonSelector)
        assert.equal(getStep(), EDUCATION_STEP)
        ReactTestUtils.Simulate.click(button)
        assert.equal(getStep(), PERSONAL_STEP)
      }
    )
  })

  for (const step of profileSteps.slice(0, 2)) {
    for (const filledOutValue of [true, false]) {
      it(`respects the current value (${filledOutValue}) when saving on ${step}`, () => {
        const updatedProfile = {
          ...USER_PROFILE_RESPONSE,
          filled_out:   filledOutValue,
          education:    [],
          work_history: []
        }
        helper.profileGetStub
          .withArgs(SETTINGS.user.username)
          .returns(Promise.resolve(updatedProfile))
        const actions =
          step === PERSONAL_STEP ? SUCCESS_SET_PROGRAM_ACTIONS : SUCCESS_ACTIONS
        return renderComponent(`/profile/${step}`, actions).then(([, div]) => {
          return confirmSaveButtonBehavior(
            updatedProfile,
            { div: div },
            step === PERSONAL_STEP ? [REQUEST_ADD_PROGRAM_ENROLLMENT] : []
          )
        })
      })
    }
  }

  it("shows a spinner when profile get is processing", () => {
    return renderComponent(
      "/profile/personal",
      SUCCESS_SET_PROGRAM_ACTIONS
    ).then(([wrapper]) => {
      wrapper.update()
      assert.equal(wrapper.find(".loader").length, 0)
      helper.store.dispatch(requestGetUserProfile(SETTINGS.user.username))
      wrapper.update()

      assert.equal(wrapper.find(".loader").length, 1)
    })
  })

  for (const activity of [true, false]) {
    it(`has proper button state when the profile patch is processing when activity=${String(
      activity
    )}`, () => {
      return renderComponent(
        "/profile/personal",
        SUCCESS_SET_PROGRAM_ACTIONS
      ).then(([wrapper]) => {
        wrapper.update()
        if (activity) {
          helper.store.dispatch(requestPatchUserProfile(SETTINGS.user.username))
          wrapper.update()
        }
        const next = wrapper.find("SpinnerButton")
        assert.equal(activity, next.props().spinning)
      })
    })
  }

  it("should enroll the user when they go to the next page", () => {
    const program = PROGRAMS[0]
    addProgramEnrollmentStub.returns(Promise.resolve(program))

    patchUserProfileStub.returns(Promise.resolve(USER_PROFILE_RESPONSE))

    helper.store.dispatch(setProgram(program))
    return renderComponent("/profile/personal", SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        assert.isFalse(addProgramEnrollmentStub.called)
        wrapper.update()

        return helper
          .listenForActions(
            [
              REQUEST_PATCH_USER_PROFILE,
              RECEIVE_PATCH_USER_PROFILE_SUCCESS,
              CLEAR_PROFILE_EDIT,
              UPDATE_PROFILE_VALIDATION,
              REQUEST_ADD_PROGRAM_ENROLLMENT,
              RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
              SET_PROFILE_STEP,
              UPDATE_VALIDATION_VISIBILITY,
              SET_TOAST_MESSAGE
            ],
            () => {
              wrapper
                .find(".next")
                .hostNodes()
                .simulate("click")
            }
          )
          .then(() => {
            assert.isTrue(addProgramEnrollmentStub.called)
          })
      }
    )
  })

  for (const [step, component] of [
    [PERSONAL_STEP, "PersonalTab"],
    [EDUCATION_STEP, "EducationTab"],
    [EMPLOYMENT_STEP, "EmploymentTab"]
  ]) {
    it(`sends the right props to tab components for step ${step}`, () => {
      const actions =
        step === PERSONAL_STEP ? SUCCESS_SET_PROGRAM_ACTIONS : SUCCESS_ACTIONS
      return renderComponent(`/profile/${step}`, actions).then(([wrapper]) => {
        wrapper.update()
        const props = wrapper.find(component).props()
        assert.deepEqual(props["ui"], helper.store.getState().ui)
        assert.deepEqual(
          props["programs"],
          helper.store.getState().programs.availablePrograms
        )
        assert.deepEqual(
          props["profile"],
          helper.store.getState().profiles["jane"].profile
        )
      })
    })
  }
})

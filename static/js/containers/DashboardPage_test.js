// eslint-disable-next-line no-redeclare
/* global document: false, window: false, SETTINGS: false */
/* eslint-disable no-unused-vars */
import { assert } from "chai"
import moment from "moment"
import ReactDOM from "react-dom"
import R from "ramda"
import Dialog from "@material-ui/core/Dialog"

import ProgramEnrollmentDialog from "../components/ProgramEnrollmentDialog"
import {
  makeAvailablePrograms,
  makeDashboard,
  makeCourse
} from "../factories/dashboard"
import IntegrationTestHelper from "../util/integration_test_helper"
import { REQUEST_DASHBOARD, CLEAR_DASHBOARD } from "../actions/dashboard"
import * as dashboardActions from "../actions/dashboard"
import { CLEAR_COUPONS } from "../actions/coupons"
import {
  SHOW_DIALOG,
  HIDE_DIALOG,
  CLEAR_UI,
  SET_ENROLL_COURSE_DIALOG_VISIBILITY,
  SET_ENROLL_SELECTED_COURSE_RUN,
  SET_ENROLL_PROGRAM_DIALOG_VISIBILITY,
  SET_ENROLL_SELECTED_PROGRAM,
  SET_ENROLL_PROGRAM_DIALOG_ERROR,
  showDialog
} from "../actions/ui"
import {
  INITIATE_SEND_EMAIL,
  START_EMAIL_EDIT,
  SEND_EMAIL_SUCCESS,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION
} from "../actions/email"
import { CLEAR_PROFILE } from "../actions/profile"
import {
  CLEAR_ENROLLMENTS,
  REQUEST_ADD_PROGRAM_ENROLLMENT,
  RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS
} from "../actions/programs"
import { EMAIL_COMPOSITION_DIALOG } from "../components/email/constants"
import { DASHBOARD_RESPONSE, ERROR_RESPONSE } from "../test_constants"
import { modifyTextField } from "../util/test_utils"
import {
  DASHBOARD_SUCCESS_ACTIONS,
  DASHBOARD_ERROR_ACTIONS,
  DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS
} from "./test_util"
import { actions } from "../lib/redux_rest"
import EmailCompositionDialog from "../components/email/EmailCompositionDialog"
import { makeRunEnrolled } from "../components/dashboard/courses/test_util"
import Grades, {
  gradeDetailPopupKey
} from "../components/dashboard/courses/Grades"
import { COURSE_GRADE } from "./DashboardPage"
import * as api from "../lib/api"

describe("DashboardPage", function() {
  this.timeout(10000)

  let renderComponent, helper, listenForActions, addProgramEnrollmentStub

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    addProgramEnrollmentStub = helper.sandbox.stub(api, "addProgramEnrollment")
    addProgramEnrollmentStub.returns(Promise.resolve())
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("shows a spinner when dashboard get is processing", () => {
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([, div]) => {
        assert.notOk(
          div.querySelector(".loader"),
          "Found spinner but no fetch in progress"
        )
        helper.store.dispatch({
          type:    REQUEST_DASHBOARD,
          payload: false,
          meta:    SETTINGS.user.username
        })

        assert(div.querySelector(".loader"), "Unable to find spinner")
      }
    )
  })

  it("has all the cards we expect", () => {
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        assert.lengthOf(wrapper.find(".dashboard-user-card").hostNodes(), 1)
        assert.lengthOf(wrapper.find(".course-list").hostNodes(), 1)
        assert.lengthOf(wrapper.find(".progress-widget").hostNodes(), 1)
        assert.lengthOf(wrapper.find(".learners-card").hostNodes(), 1)
      }
    )
  })

  it("doesnt show LearnersCard if no learners", () => {
    helper.programLearnersStub.returns(
      Promise.resolve({
        learners:       [],
        learners_count: 0
      })
    )

    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        assert.lengthOf(wrapper.find(".learners-card"), 0)
      }
    )
  })

  it("should show no program enrolled view", () => {
    helper.dashboardStub.returns(Promise.resolve({ programs: [] }))

    return renderComponent(
      "/dashboard",
      DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS
    ).then(([wrapper]) => {
      const text = wrapper
        .find(".no-program-card")
        .hostNodes()
        .text()
      assert.equal(
        text,
        "You are not currently enrolled in any programsEnroll in a MicroMasters Program"
      )
    })
  })

  it("should enroll user in program", () => {
    const dashboard = makeDashboard()
    helper.dashboardStub.returns(Promise.resolve({ programs: [] }))
    const availablePrograms = makeAvailablePrograms(dashboard, false)
    helper.programsGetStub.returns(Promise.resolve(availablePrograms))
    addProgramEnrollmentStub.returns(Promise.resolve(availablePrograms[0]))

    return renderComponent(
      "/dashboard",
      DASHBOARD_SUCCESS_NO_LEARNERS_ACTIONS
    ).then(([wrapper]) => {
      const link = wrapper.find(".enroll-wizard-button")
      assert.equal(link.text(), "Enroll in a MicroMasters Program")
      return helper
        .listenForActions([SET_ENROLL_PROGRAM_DIALOG_VISIBILITY], () => {
          link.simulate("click")
        })
        .then(() => {
          assert.isFalse(addProgramEnrollmentStub.called)
          const enrollBtn = document.querySelector(".enroll-button")
          return helper
            .listenForActions([SET_ENROLL_PROGRAM_DIALOG_ERROR], () => {
              enrollBtn.click()
            })
            .then(() => {
              return helper
                .listenForActions(
                  [
                    REQUEST_ADD_PROGRAM_ENROLLMENT,
                    RECEIVE_ADD_PROGRAM_ENROLLMENT_SUCCESS,
                    SET_ENROLL_SELECTED_PROGRAM
                  ],
                  () => {
                    const props = wrapper
                      .find(ProgramEnrollmentDialog)
                      .at(2)
                      .props()
                    props.setSelectedProgram(availablePrograms[0].id)
                    enrollBtn.click()
                  }
                )
                .then(() => {
                  assert.isTrue(addProgramEnrollmentStub.called)
                })
            })
        })
    })
  })

  it("should show a <Grades /> component, and open the dialog when clicked", () => {
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        wrapper
          .find(Grades)
          .find(".open-popup")
          .first()
          .simulate("click")
        const state = helper.store.getState().ui
        const key = gradeDetailPopupKey(
          COURSE_GRADE,
          DASHBOARD_RESPONSE.programs[0].courses[0].title
        )
        assert.isTrue(state.dialogVisibility[key])
      }
    )
  })

  it("should close the <Grades /> dialog if you click outside", () => {
    const key = gradeDetailPopupKey(
      COURSE_GRADE,
      DASHBOARD_RESPONSE.programs[0].courses[0].title
    )

    helper.store.dispatch(showDialog(key))
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([wrapper]) => {
        wrapper
          .find(Grades)
          .find(Dialog)
          .first()
          .props()
          .onClose()
        const state = helper.store.getState().ui
        assert.isFalse(state.dialogVisibility[key])
      }
    )
  })

  it("dispatches actions to clean up after unmounting", () => {
    return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
      ([, div]) => {
        return helper.listenForActions(
          [
            CLEAR_PROFILE,
            CLEAR_UI,
            CLEAR_ENROLLMENTS,
            CLEAR_DASHBOARD,
            actions.programLearners.clearType,
            CLEAR_COUPONS
          ],
          () => {
            ReactDOM.unmountComponentAtNode(div)
          }
        )
      }
    )
  })

  describe("course contact UI behavior", () => {
    let dashboardResponse
    // Since financial aid is removed, all messages show "verified learners"
    const faExpectedStateList = [
      {
        hasFA:           true,
        expectedMessage: "This is a premium feature for verified learners."
      },
      {
        hasFA:           false,
        expectedMessage: "This is a premium feature for verified learners."
      }
    ]
    const CONTACT_LINK_SELECTOR = ".contact-link"
    const EMAIL_DIALOG_ACTIONS = [START_EMAIL_EDIT, SHOW_DIALOG]

    beforeEach(() => {
      // Limit the dashboard response to 1 program
      dashboardResponse = {
        programs: [R.clone(DASHBOARD_RESPONSE.programs[0])]
      }
    })

    it("shows the email composition dialog when a user has permission to contact a course team", () => {
      const course = makeCourse()
      course.has_contact_email = true
      makeRunEnrolled(course.runs[0])
      dashboardResponse.programs[0].courses = [course]
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse))

      return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
        ([wrapper]) => {
          const contactLink = wrapper.find(CONTACT_LINK_SELECTOR).at(0)

          return listenForActions(EMAIL_DIALOG_ACTIONS, () => {
            contactLink.simulate("click")
          }).then(state => {
            assert.isTrue(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG])

            modifyTextField(document.querySelector(".email-subject"), "subject")
            // it is difficult to programmatically edit the draft-js field
            wrapper
              .find(EmailCompositionDialog)
              .props()
              .updateEmailFieldEdit("body", { target: { value: "body" } })

            return listenForActions(
              [
                UPDATE_EMAIL_VALIDATION,
                INITIATE_SEND_EMAIL,
                SEND_EMAIL_SUCCESS,
                CLEAR_EMAIL_EDIT,
                HIDE_DIALOG
              ],
              () => {
                document
                  .querySelector(".email-composition-dialog .save-button")
                  .click()
              }
            ).then(state => {
              assert.isFalse(
                state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG]
              )
              assert.isTrue(
                helper.sendCourseTeamMail.calledWith(
                  "subject",
                  "body",
                  course.id
                )
              )
            })
          })
        }
      )
    })
  })

  describe("course enrollment dialog", () => {
    let dashboardResponse
    const ENROLL_BUTTON_SELECTOR = ".course-list .enroll-button"
    const COURSE_ENROLL_DIALOG_ACTIONS = [
      SET_ENROLL_COURSE_DIALOG_VISIBILITY,
      SET_ENROLL_SELECTED_COURSE_RUN
    ]

    beforeEach(() => {
      // Limit the dashboard response to 1 program
      dashboardResponse = {
        programs: [R.clone(DASHBOARD_RESPONSE.programs[0])]
      }
    })

    it("renders correctly", () => {
      const course = makeCourse()
      course.runs[0].enrollment_start_date = moment().subtract(2, "days")
      dashboardResponse.programs[0].courses = [course]
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse))

      return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
        ([wrapper]) => {
          const enrollButton = wrapper.find(ENROLL_BUTTON_SELECTOR).at(0)

          return listenForActions(COURSE_ENROLL_DIALOG_ACTIONS, () => {
            enrollButton.simulate("click")
          }).then(state => {
            assert.isTrue(state.ui.enrollCourseDialogVisibility)
            assert.deepEqual(state.ui.enrollSelectedCourseRun, course.runs[0])
          })
        }
      )
    })
  })

  describe("edx cache refresh error message", () => {
    let dashboardResponse
    const ERROR_MESSAGE_SELECTOR = ".alert-message-inline"

    beforeEach(() => {
      dashboardResponse = R.clone(DASHBOARD_RESPONSE)
    })

    it("if the edx is fresh there is no error box", () => {
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse))
      return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
        ([wrapper]) => {
          assert.lengthOf(wrapper.find(ERROR_MESSAGE_SELECTOR), 0)
        }
      )
    })

    it("if the edx is not fresh there is the error box", () => {
      dashboardResponse.is_edx_data_fresh = false
      helper.dashboardStub.returns(Promise.resolve(dashboardResponse))
      return renderComponent("/dashboard", DASHBOARD_SUCCESS_ACTIONS).then(
        ([wrapper]) => {
          assert.lengthOf(wrapper.find(ERROR_MESSAGE_SELECTOR), 1)
        }
      )
    })

    it("if the dashboard does not load there is no error box for edx cache", () => {
      helper.dashboardStub.returns(Promise.reject(ERROR_RESPONSE))
      return renderComponent("/dashboard", DASHBOARD_ERROR_ACTIONS).then(
        ([wrapper]) => {
          assert.lengthOf(wrapper.find(ERROR_MESSAGE_SELECTOR), 0)
        }
      )
    })
  })
})

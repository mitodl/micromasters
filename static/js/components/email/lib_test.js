import React from "react"
import R from "ramda"
import _ from "lodash"
import { mount } from "enzyme"
import { assert } from "chai"
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider"
import getMuiTheme from "material-ui/styles/getMuiTheme"
import fetchMock from "fetch-mock"

import IntegrationTestHelper from "../../util/integration_test_helper"
import { USER_PROFILE_RESPONSE } from "../../test_constants"
import { withEmailDialog } from "./hoc"
import {
  EMAIL_COMPOSITION_DIALOG,
  LEARNER_EMAIL_TYPE,
  AUTOMATIC_EMAIL_ADMIN_TYPE
} from "./constants"
import {
  LEARNER_EMAIL_CONFIG,
  AUTOMATIC_EMAIL_ADMIN_CONFIG,
  convertEmailEdit,
  getFilters,
  findFilters
} from "./lib"
import {
  START_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
  INITIATE_SEND_EMAIL
} from "../../actions/email"
import { SHOW_DIALOG } from "../../actions/ui"
import { INITIAL_EMAIL_STATE } from "../../reducers/email"
import { actions } from "../../lib/redux_rest"

describe("Specific email config", () => {
  let helper,
    listenForActions,
    EMAIL_DIALOG_ACTIONS = [START_EMAIL_EDIT, SHOW_DIALOG]

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    listenForActions = helper.listenForActions.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  let wrapContainerComponent = (component, emailKey, emailConfig) =>
    R.compose(
      withEmailDialog({
        [emailKey]: emailConfig
      })
    )(component)

  let renderTestComponentWithDialog = (
    Component,
    emailKey,
    { emailState = INITIAL_EMAIL_STATE, dialogVisible = false } = {}
  ) => {
    let fullEmailState = {
      currentlyActive: emailKey,
      [emailKey]:      emailState
    }
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Component
          dispatch={helper.store.dispatch}
          ui={{
            dialogVisibility: { [EMAIL_COMPOSITION_DIALOG]: dialogVisible }
          }}
          email={fullEmailState}
        />
      </MuiThemeProvider>
    )
  }

  const queryFilters = `{
    "bool": {
      "must":[
        { 
          "nested": {
            "path": "program.enrollments",
            "filter": {
              "term": {
                "program.enrollments.payment_status": "Paid"
              }
            }
          }
        },
        {
          "term": {
            "program.id":1
          }
        }
      ]
    }
  }`

  describe("for the learner email", () => {
    let wrapper,
      profile = R.clone(USER_PROFILE_RESPONSE)

    let filledOutEmailState = _.merge(R.clone(INITIAL_EMAIL_STATE), {
      params: {
        studentId:    123,
        profileImage: "img.jpg"
      },
      inputs: {
        subject: "subject",
        body:    "body"
      },
      subheading: "first_name last_name"
    })

    class TestContainerPage extends React.Component {
      render() {
        let { openEmailComposer } = this.props
        return (
          <div>
            <button
              onClick={R.partial(openEmailComposer(LEARNER_EMAIL_TYPE), [
                profile
              ])}
            >
              Open Email
            </button>
          </div>
        )
      }
    }

    let wrappedContainerComponent = wrapContainerComponent(
      TestContainerPage,
      LEARNER_EMAIL_TYPE,
      LEARNER_EMAIL_CONFIG
    )

    it("should set the correct parameters when it opens", () => {
      wrapper = renderTestComponentWithDialog(
        wrappedContainerComponent,
        LEARNER_EMAIL_TYPE
      )
      let dialogComponent = wrapper.find("EmailCompositionDialog")
      let emailButton = wrapper.find("button")
      assert.equal(dialogComponent.props().title, LEARNER_EMAIL_CONFIG.title)

      return listenForActions(EMAIL_DIALOG_ACTIONS, () => {
        emailButton.simulate("click")
      }).then(state => {
        let emailParams = state.email[LEARNER_EMAIL_TYPE].params
        assert.equal(emailParams.studentId, profile.student_id)
        assert.isDefined(emailParams.profileImage)
      })
    })

    it("should render a subheading with a profile image and student name", () => {
      wrapper = renderTestComponentWithDialog(
        wrappedContainerComponent,
        LEARNER_EMAIL_TYPE,
        { emailState: filledOutEmailState, dialogVisible: true }
      )
      let dialogComponent = wrapper.find("EmailCompositionDialog")
      let renderedSubheading = mount(
        dialogComponent.props().subheadingRenderer(filledOutEmailState)
      )

      assert.equal(renderedSubheading.find("img").prop("src"), "img.jpg")
      assert.include(
        renderedSubheading.html(),
        "<span>first_name last_name</span>"
      )
    })

    it("should call the appropriate API method with the right parameters upon submission", () => {
      wrapper = renderTestComponentWithDialog(
        wrappedContainerComponent,
        LEARNER_EMAIL_TYPE,
        { emailState: filledOutEmailState, dialogVisible: true }
      )
      let dialogComponent = wrapper.find("EmailCompositionDialog")

      return listenForActions(
        [UPDATE_EMAIL_VALIDATION, INITIATE_SEND_EMAIL],
        () => {
          dialogComponent.props().closeEmailComposerAndSend()
        }
      ).then(() => {
        assert.isTrue(helper.sendLearnerMail.calledOnce)
        assert.deepEqual(helper.sendLearnerMail.firstCall.args, [
          "subject",
          "body",
          123
        ])
      })
    })

    it("shouldnt use the sendMail email action, if the email config specifies differently", () => {
      let automaticEmailState = _.clone(filledOutEmailState)
      automaticEmailState.inputs.id = 1
      fetchMock.mock("/api/v0/mail/automatic_email/1/", () => ({}))

      let wrapped = wrapContainerComponent(
        TestContainerPage,
        AUTOMATIC_EMAIL_ADMIN_TYPE,
        AUTOMATIC_EMAIL_ADMIN_CONFIG
      )
      wrapper = renderTestComponentWithDialog(
        wrapped,
        AUTOMATIC_EMAIL_ADMIN_TYPE,
        { emailState: automaticEmailState, dialogVisible: true }
      )
      let dialogComponent = wrapper.find("EmailCompositionDialog")
      return listenForActions(
        [UPDATE_EMAIL_VALIDATION, actions.automaticEmails.patch.requestType],
        () => {
          dialogComponent.props().closeEmailComposerAndSend()
        }
      ).then(() => {
        assert.isFalse(helper.sendLearnerMail.called)
      })
    })
  })

  describe("helper functions", () => {
    describe("convertEmailEdit", () => {
      it("should turn any keys like `email_foo` to be `foo`", () => {
        [
          [{ email_foo: "a" }, { foo: "a" }],
          [{ email_subject: "a" }, { subject: "a" }],
          [{ email_body: "a" }, { body: "a" }]
        ].forEach(([obj, expectation]) => {
          assert.deepEqual(convertEmailEdit(obj), expectation)
        })
      })

      it("it should preserve any other keys", () => {
        let obj = {
          email_subject: "potato",
          other_field:   "should be here!"
        }
        let expectation = {
          subject:     "potato",
          other_field: "should be here!"
        }
        assert.deepEqual(convertEmailEdit(obj), expectation)
      })

      it("should transform `subject` and `body` by prefixing `email_`", () => {
        [
          [{ subject: "a" }, { email_subject: "a" }],
          [{ body: "a" }, { email_body: "a" }]
        ].forEach(([obj, exp]) => assert.deepEqual(convertEmailEdit(obj), exp))
      })

      it("should be a symmetric relation (sorta)", () => {
        [
          { email_subject: "a", no: "way" },
          { email_body: "a", what: "even" },
          { other_field: "yea..." }
        ].forEach(obj => {
          assert.deepEqual(convertEmailEdit(convertEmailEdit(obj)), obj)
        })
      })

      it("should return filters", () => {
        let filters = getFilters(JSON.parse(queryFilters))
        assert.deepEqual(filters, [
          {
            id:    "program.enrollments.payment_status",
            name:  "program.enrollments.payment_status",
            value: "Paid"
          }
        ])
      })

      describe("getFilters", () => {
        it("should return filters", () => {
          let filters = getFilters(JSON.parse(queryFilters))
          assert.deepEqual(filters, [
            {
              id:    "program.enrollments.payment_status",
              name:  "program.enrollments.payment_status",
              value: "Paid"
            }
          ])
        })
      })

      describe("findFilters", () => {
        it("should return an empty list if passed an empty object", () => {
          let filters = findFilters({})
          assert.deepEqual(filters, [])
        })

        it('should return an empty list if passed an object without any "term" and "range" key on it', () => {
          const query = `{
            "bool": {
              "must":[
                {
                  "program.id":1
                }
              ]
            }
          }`
          let filters = findFilters(JSON.parse(query))
          assert.deepEqual(filters, [])
        })

        it("should return a list of filters defined at the top-level", () => {
          const query = `{
            "bool": {
              "must":[
                {
                  "range": {
                    "program.grade_average": {
                      "gte": 0,
                      "lte": 81
                    }
                  }
                },
                {
                  "term": {
                    "profile.birth_country": "US"
                  }
                },
                {
                  "term": {
                    "profile.country": "US"
                  }
                }
              ]
            }
          }`
          let filters = findFilters(JSON.parse(query))
          assert.deepEqual(filters, [
            { "program.grade_average": { gte: 0, lte: 81 } },
            { "profile.birth_country": "US" },
            { "profile.country": "US" }
          ])
        })

        it("should return a list of filters which are nested in the object", () => {
          const query = `{
            "bool": {
              "must": [
                {
                  "nested": {
                    "path": "program.enrollments",
                    "filter": {
                      "bool": {
                        "must": [
                          {
                            "term": {
                              "program.enrollments.course_title": "Digital Learning 100"
                            }
                          },
                          {
                            "range": {
                              "program.enrollments.final_grade": {
                                "gte": 0,
                                "lte": 89
                              }
                            }
                          },
                          {
                            "term": {
                              "program.enrollments.payment_status": "Paid"
                            }
                          },
                          {
                            "term": {
                              "program.enrollments.semester": "2016 - Summer"
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }`
          let filters = findFilters(JSON.parse(query))
          assert.deepEqual(filters, [
            { "program.enrollments.course_title": "Digital Learning 100" },
            { "program.enrollments.final_grade": { gte: 0, lte: 89 } },
            { "program.enrollments.payment_status": "Paid" },
            { "program.enrollments.semester": "2016 - Summer" }
          ])
        })

        it("should return a list of filters which are nested at different levels", () => {
          let query = `{
            "bool": {
              "must": [
                {
                  "nested": {
                    "path": "program.enrollments",
                    "filter": {
                      "bool": {
                        "must": [
                          {
                            "term": {
                              "program.enrollments.course_title": "Digital Learning 100"
                            }
                          }
                        ]
                      }
                    }
                  }
                },
                {
                  "nested": {
                    "path": "profile.education",
                    "filter": {
                      "term": {
                        "profile.education.degree_name": "b"
                      }
                    }
                  }
                },
                {
                  "nested": {
                    "path": "profile.work_history",
                    "filter": {
                      "term": {
                        "profile.work_history.company_name": "Volvo"
                      }
                    }
                  }
                },
                {
                  "term": {
                    "program.id": 1
                  }
                }
              ]
            }
          }`
          let filters = findFilters(JSON.parse(query))
          assert.deepEqual(filters, [
            { "program.enrollments.course_title": "Digital Learning 100" },
            { "profile.education.degree_name": "b" },
            { "profile.work_history.company_name": "Volvo" }
          ])
        })

        it("should ignore program.id", () => {
          const query = `{
            "bool": {
              "must":[
                {
                  "term": {
                    "program.id":1
                  }
                }
              ]
            }
          }`
          let filters = findFilters(JSON.parse(query))
          assert.deepEqual(filters, [])
        })
      })
    })
  })
})

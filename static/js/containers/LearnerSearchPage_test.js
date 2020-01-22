/* global SETTINGS: false */
import { assert } from "chai"
import _ from "lodash"
import sinon from "sinon"
import MockAdapter from "axios-mock-adapter"
import axios from "axios"
import { Utils as SearchkitUtils } from "searchkit"
import qs from "qs"
import { browserHistory } from "react-router"

import { wait } from "../util/util"
import IntegrationTestHelper from "../util/integration_test_helper"
import { PROGRAMS, ELASTICSEARCH_RESPONSE } from "../test_constants"
import {
  INITIATE_SEND_EMAIL,
  START_EMAIL_EDIT,
  SEND_EMAIL_SUCCESS,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
  UPDATE_EMAIL_EDIT
} from "../actions/email"
import { START_CHANNEL_EDIT } from "../actions/channels"
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS
} from "../actions/dashboard"
import { SHOW_DIALOG, HIDE_DIALOG } from "../actions/ui"
import { EMAIL_COMPOSITION_DIALOG } from "../components/email/constants"
import { CHANNEL_CREATE_DIALOG } from "../constants"
import { matchFieldName } from "../components/search/util"
import { modifyTextField } from "../util/test_utils"
import EmailCompositionDialog from "../components/email/EmailCompositionDialog"

describe("LearnerSearchPage", function() {
  const EMAIL_LINK_SELECTOR = "#email-selected"
  let renderComponent, listenForActions, helper, mockAxios, replySpy

  beforeEach(() => {
    // reset Searchkit's guid counter so that it matches our expected data for each test
    SearchkitUtils.guidCounter = 1
    mockAxios = new MockAdapter(axios)

    helper = new IntegrationTestHelper()
    replySpy = helper.sandbox
      .stub()
      .returns(Promise.resolve([200, _.cloneDeep(ELASTICSEARCH_RESPONSE)]))
    mockAxios.onPost("/_search").reply(replySpy)
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    SETTINGS.roles = [
      {
        role:        "staff",
        program:     PROGRAMS[0].id,
        permissions: ["can_message_learners", "can_create_forums"]
      }
    ]
  })

  afterEach(() => {
    helper.cleanup()
    mockAxios.restore()
  })

  it("spinner works", () => {
    return renderComponent("/learners").then(([wrapper, div]) => {
      assert.equal(div.querySelector(".loader").style.display, "block")
      const searchkit = wrapper.find("SearchkitProvider").props().searchkit
      searchkit.registrationCompleted
        .then(() => Promise.resolve([wrapper, div]))
        .then((wrapper, div) => {
          assert.equal(div.querySelector(".loader").style.display, "none")
        })
    })
  })

  const renderSearch = async (query: Object) => {
    const url = query ? `/learners?${qs.stringify(query)}` : "/learners"
    const [wrapper] = await renderComponent(url)
    const searchkit = wrapper.find("SearchkitProvider").props().searchkit
    await searchkit.registrationCompleted
    // cycle through the event loop to let searchkit do its rendering
    await wait(0)
    wrapper.update()
    return [wrapper]
  }

  it("calls the elasticsearch API", () => {
    assert.equal(replySpy.callCount, 0)
    return renderSearch().then(() => {
      assert.equal(replySpy.callCount, 1)

      const callArgs = replySpy.firstCall.args[0]
      assert.deepEqual(callArgs.url, "/_search")
      assert.deepEqual(callArgs.method, "post")
    })
  })

  it("filters by program id for current enrollment", () => {
    return renderSearch().then(() => {
      assert.equal(replySpy.callCount, 1)

      const callArgs = replySpy.firstCall.args[0]
      const body = JSON.parse(callArgs.data)
      assert.deepEqual(body.post_filter.term["program.id"], PROGRAMS[0].id)
    })
  })

  it("uses total_courses for num courses passed max", () => {
    return renderSearch().then(([wrapper]) => {
      assert.equal(
        wrapper
          .find("EnabledSelectionRangeFilter")
          .at(0)
          .props().max,
        1
      )
    })
  })

  it("should set sendAutomaticEmails flag", () => {
    const EMAIL_DIALOG_ACTIONS = [START_EMAIL_EDIT, SHOW_DIALOG]

    return renderSearch().then(([wrapper]) => {
      const emailLink = wrapper.find(EMAIL_LINK_SELECTOR).at(0)

      return listenForActions(EMAIL_DIALOG_ACTIONS, () => {
        emailLink.simulate("click")
      }).then(state => {
        assert.isTrue(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG])
        return listenForActions([UPDATE_EMAIL_EDIT], () => {
          document.querySelector(".create-campaign input").click()
        }).then(state => {
          assert.isTrue(
            state.email[state.email.currentlyActive].inputs.sendAutomaticEmails
          )
        })
      })
    })
  })

  it("sends an email using the email link", () => {
    const EMAIL_DIALOG_ACTIONS = [START_EMAIL_EDIT, SHOW_DIALOG]

    return renderComponent("/learners").then(([wrapper]) => {
      const emailLink = wrapper.find(EMAIL_LINK_SELECTOR).at(0)

      return listenForActions(EMAIL_DIALOG_ACTIONS, () => {
        emailLink.simulate("click")
      }).then(state => {
        assert.isTrue(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG])

        modifyTextField(document.querySelector(".email-subject"), "subject")
        // it is difficult to programmatically edit the draft-js field
        wrapper
          .find(EmailCompositionDialog)
          .props()
          .updateEmailFieldEdit("body", { target: { value: "body" } })
        document.querySelector(".create-campaign input").click()

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
          assert.isFalse(state.ui.dialogVisibility[EMAIL_COMPOSITION_DIALOG])
          assert.isTrue(
            helper.sendSearchResultMail.calledWith(
              "subject",
              "body",
              sinon.match.any,
              true
            )
          )
          assert.deepEqual(
            Object.keys(helper.sendSearchResultMail.firstCall.args[2]),
            ["post_filter", "aggs", "size", "sort"]
          )
        })
      })
    })
  })

  it("does not render the email link for learner users", () => {
    SETTINGS.roles = []

    return renderComponent("/learners").then(([wrapper]) => {
      assert.isFalse(wrapper.find(EMAIL_LINK_SELECTOR).exists())
    })
  })

  const CHANNEL_LINK_SELECTOR = "#create-channel-selected"

  it("does not render the new channel link for learner users", () => {
    SETTINGS.roles = []

    return renderComponent("/learners").then(([wrapper]) => {
      assert.isFalse(wrapper.find(CHANNEL_LINK_SELECTOR).exists())
    })
  })
  it("does not render the new channel link if the feature is disabled", () => {
    SETTINGS.FEATURES.DISCUSSIONS_CREATE_CHANNEL_UI = false

    return renderComponent("/learners").then(([wrapper]) => {
      assert.isFalse(wrapper.find(CHANNEL_LINK_SELECTOR).exists())
    })
  })

  it("should show the new channel dialog", () => {
    const CHANNEL_DIALOG_ACTIONS = [START_CHANNEL_EDIT, SHOW_DIALOG]

    return renderSearch().then(([wrapper]) => {
      const channelLink = wrapper.find(CHANNEL_LINK_SELECTOR).at(0)

      return listenForActions(CHANNEL_DIALOG_ACTIONS, () => {
        channelLink.simulate("click")
      }).then(state => {
        assert.isTrue(state.ui.dialogVisibility[CHANNEL_CREATE_DIALOG])
      })
    })
  })

  const STAFF_ONLY_FILTERS = [
    "payment_status",
    "num-courses-passed",
    "grade-average",
    "education_level"
  ]

  describe("does not render staff filters for learner users", () => {
    for (const selector of STAFF_ONLY_FILTERS) {
      it(`.filter--${selector}`, () => {
        SETTINGS.roles = []
        return renderComponent("/learners").then(([wrapper]) => {
          assert.isFalse(wrapper.find(`.filter--${selector}`).exists())
        })
      })
    }
    it(".final-grade-wrapper", () => {
      // special case for final grade since it is handled differently
      SETTINGS.roles = []
      return renderComponent("/learners").then(([wrapper]) => {
        assert.isFalse(wrapper.find(".final-grade-wrapper").exists())
      })
    })
  })

  describe("does render staff filters for staff users", () => {
    for (const selector of STAFF_ONLY_FILTERS) {
      it(`.filter--${selector}`, () => {
        return renderComponent("/learners").then(([wrapper]) => {
          assert.isTrue(wrapper.find(`.filter--${selector}`).exists())
        })
      })
    }
    it(".final-grade-wrapper", () => {
      // special case for final grade since it is handled differently
      return renderComponent("/learners").then(([wrapper]) => {
        assert.isTrue(wrapper.find(".final-grade-wrapper").exists())
      })
    })
  })

  it("sends a request to find users by name when text is entered into the search box", () => {
    return renderSearch()
      .then(([wrapper]) => {
        wrapper
          .find("CustomSearchBox")
          .find('input[type="text"]')
          .props()
          .onChange({
            target: {
              value: "xyz"
            }
          })
      })
      .then(() => {
        // initial load, then update for value of xyz
        assert.equal(replySpy.callCount, 2)
        const callArgs = replySpy.secondCall.args[0]
        const body = JSON.parse(callArgs.data)
        const query = body.query.multi_match
        assert.deepEqual(query, {
          fields: [
            "profile.first_name.folded",
            "profile.last_name.folded",
            "profile.preferred_name.folded",
            "profile.username.folded",
            "profile.full_name.folded",
            "email.folded"
          ],
          analyzer: "folding",
          query:    "xyz",
          type:     "phrase_prefix"
        })
        assert.equal(window.location.toString(), "http://fake/learners?q=xyz")
      })
  })

  describe("work history facet", () => {
    it("has the expected aggregations", () => {
      return renderSearch().then(() => {
        assert.equal(replySpy.callCount, 1)
        const callArgs = replySpy.firstCall.args[0]
        const body = JSON.parse(callArgs.data)

        const keys = Object.keys(body.aggs)
        const degreeNameKeys = keys.filter(matchFieldName("company_name"))

        // make sure the accessor is modifying an existing field and not adding a new one with a different name
        assert.lengthOf(degreeNameKeys, 1)
        const degreeNameKey = degreeNameKeys[0]

        assert.deepEqual(body.aggs[degreeNameKey], {
          aggs: {
            inner: {
              aggs: {
                "profile.work_history.company_name": {
                  aggs: {
                    company_name_count: {
                      aggs: {
                        count: {
                          cardinality: {
                            field: "user_id"
                          }
                        }
                      },
                      reverse_nested: {}
                    }
                  },
                  terms: {
                    field: "profile.work_history.company_name",
                    size:  20
                  }
                },
                "profile.work_history.company_name_count": {
                  cardinality: {
                    field: "profile.work_history.company_name"
                  }
                }
              },
              nested: {
                path: "profile.work_history"
              }
            }
          },
          filter: {
            term: {
              "program.id": PROGRAMS[0].id
            }
          }
        })
      })
    })

    it("displays the correct number in the UI", () => {
      return renderSearch().then(([wrapper]) => {
        const workHistoryItems = wrapper
          .find("ModifiedMultiSelect Select")
          .props().options

        const expected = [
          ["Hyundai", 7],
          ["Chase", 6],
          ["Goldman Sachs", 6],
          ["Google", 6],
          ["Volvo", 6],
          ["Ford", 5],
          ["TD Bank", 5],
          ["Toyota", 5],
          ["Apple", 4],
          ["Microsoft", 4],
          ["Berkshire Hathaway", 3],
          ["Fidelity", 3],
          ["Bank of America", 2],
          ["Vanguard", 2],
          ["Audi", 1],
          ["ME", 1]
        ]

        assert.deepEqual(
          workHistoryItems,
          expected.map(([company, count]) => ({
            label: `${company} (${count}) `,
            value: company
          }))
        )
      })
    })
  })

  describe("education facet", () => {
    it("has the expected aggregations", () => {
      return renderSearch().then(() => {
        assert.equal(replySpy.callCount, 1)
        const callArgs = replySpy.firstCall.args[0]
        const body = JSON.parse(callArgs.data)

        const keys = Object.keys(body.aggs)
        const degreeNameKeys = keys.filter(matchFieldName("education_level"))

        // make sure the accessor is modifying an existing field and not adding a new one with a different name
        assert.lengthOf(degreeNameKeys, 1)
        const degreeNameKey = degreeNameKeys[0]

        assert.deepEqual(body.aggs[degreeNameKey], {
          filter: {
            term: {
              "program.id": 3
            }
          },
          aggs: {
            inner: {
              nested: {
                path: "profile.education"
              },
              aggs: {
                "profile.education.degree_name": {
                  terms: {
                    field: "profile.education.degree_name",
                    size:  50
                  },
                  aggs: {
                    school_name_count: {
                      reverse_nested: {},
                      aggs:           {
                        count: {
                          cardinality: {
                            field: "user_id"
                          }
                        }
                      }
                    }
                  }
                },
                "profile.education.degree_name_count": {
                  cardinality: {
                    field: "profile.education.degree_name"
                  }
                }
              }
            }
          }
        })
      })
    })

    it("displays the correct number in the UI", () => {
      return renderSearch().then(([wrapper]) => {
        const educationItems = wrapper.find("EducationFilter ItemList").props()
          .items

        assert.deepEqual(educationItems, [
          { doc_count: 66, key: "$all", label: "All" },
          { doc_count: 65, key: "hs" },
          { doc_count: 64, key: "b" },
          { doc_count: 57, key: "m" }
        ])
      })
    })
  })

  describe("course enrollment filters", () => {
    it("have the expected aggregations", () => {
      const innerKey = "program.courses.course_title"
      const topLevelKey = `${innerKey}2`

      return renderSearch().then(() => {
        const callArgs = replySpy.firstCall.args[0]
        const body = JSON.parse(callArgs.data)
        assert.isDefined(body.aggs[topLevelKey])

        const innerAggs = body.aggs[topLevelKey].aggs.inner
        assert.deepEqual(innerAggs.nested, { path: "program.courses" })
        assert.equal(innerAggs.aggs[innerKey].terms.field, innerKey)
        assert.deepEqual(innerAggs.aggs[innerKey].aggs, {
          top_level_doc_count: { reverse_nested: {} }
        })
      })
    })

    it("displays the correct options and counts in the UI", () => {
      return renderSearch().then(([wrapper]) => {
        const allEnrollmentItems = wrapper.find(
          "NestedAggregatingMenuFilter ItemList"
        )
        const courseTitleItems = allEnrollmentItems.at(0).prop("items")
        const paymentStatusItems = allEnrollmentItems.at(1).prop("items")

        assert.deepEqual(_.pick(courseTitleItems[0], ["key", "doc_count"]), {
          doc_count: 66,
          key:       "$all"
        })
        assert.deepEqual(
          _.pick(courseTitleItems[1], ["key", "doc_count"]),
          // doc_count for these custom nested aggregations should be set to the reverse_nested count
          // instead of the normal doc_count
          { doc_count: 65, key: "Digital Learning 100" }
        )
        assert.deepEqual(_.pick(courseTitleItems[2], ["key", "doc_count"]), {
          doc_count: 31,
          key:       "Digital Learning 200"
        })

        assert.deepEqual(_.pick(paymentStatusItems[0], ["key", "doc_count"]), {
          doc_count: 66,
          key:       "$all"
        })
        assert.deepEqual(_.pick(paymentStatusItems[1], ["key", "doc_count"]), {
          doc_count: 65,
          key:       "Auditing"
        })
        assert.deepEqual(_.pick(paymentStatusItems[2], ["key", "doc_count"]), {
          doc_count: 31,
          key:       "Paid"
        })
      })
    })
  })

  describe("filter titles", () => {
    it("has proper filter titles", () => {
      const query = {
        courses:              ["Digital Learning 200"],
        "final-grade":        { min: 50, max: 100 },
        payment_status:       ["Paid"],
        semester:             ["2016 - Spring"],
        "num-courses-passed": {},
        "grade-average":      { min: 47, max: 100 },
        birth_location:       ["US"],
        country:              [["US"], ["US-ME"]],
        education_level:      ["hs"],
        company_name:         ["Microsoft"]
      }
      return renderSearch().then(([wrapper]) => {
        const searchkit = wrapper.find("SearchkitProvider").props().searchkit
        searchkit.searchFromUrlQuery(qs.stringify(query))
        wrapper.update()
        const titles = wrapper
          .find(".mm-filters .sk-selected-filters-option__name")
          .map(filter => filter.text())
        assert.deepEqual(titles, [
          "Course: Digital Learning 200",
          "Final Grade in Selected Course: 50 - 100",
          "Payment Status: Paid",
          "Semester: 2016 - Spring",
          "Average Grade in Program: 47 - 100",
          "Country of Birth: United States",
          "United States: Maine",
          "Degree: High school",
          "Company: Microsoft"
        ])
      })
    })

    it("has proper filter titles when company name and state name are same", () => {
      const query = {
        courses:         ["Digital Learning 200"],
        birth_location:  ["US"],
        country:         [["US"], ["US-ME"]],
        education_level: ["hs"],
        company_name:    ["US-ME"]
      }
      return renderSearch().then(([wrapper]) => {
        const searchkit = wrapper.find("SearchkitProvider").props().searchkit
        searchkit.searchFromUrlQuery(qs.stringify(query))
        wrapper.update()
        const titles = wrapper
          .find(".mm-filters .sk-selected-filters-option__name")
          .map(filter => filter.text())
        assert.deepEqual(titles, [
          "Course: Digital Learning 200",
          "Country of Birth: United States",
          "United States: Maine",
          "Degree: High school",
          "Company: US-ME"
        ])
      })
    })
  })

  it("shows filters and the textbox even if there are no results", () => {
    const query = {
      courses:              ["Digital Learning 200"],
      "final-grade":        { min: 50, max: 100 },
      payment_status:       ["Paid"],
      semester:             ["2016 - Spring"],
      "num-courses-passed": {},
      "grade-average":      { min: 47, max: 100 },
      birth_location:       ["US"],
      country:              [["US"], ["US-ME"]],
      education_level:      ["hs"],
      company_name:         ["Microsoft"]
    }

    const noHitsResponse = {
      hits: {
        total:     0,
        max_score: null,
        hits:      []
      }
    }
    replySpy.returns(Promise.resolve([200, noHitsResponse]))
    return renderSearch().then(([wrapper]) => {
      const searchkit = wrapper.find("SearchkitProvider").props().searchkit
      searchkit.searchFromUrlQuery(qs.stringify(query))

      assert(wrapper.find(".sk-search-box"), "Unable to find textbox")
      assert.equal(wrapper.find(".filter-visibility-toggle").length, 9)
    })
  })

  it("has correctly adjusted filters for the final grade", async () => {
    const query = {
      courses:       ["Digital Learning 200"],
      "final-grade": { min: 40, max: 100 }
    }

    await renderSearch(query)

    assert.equal(replySpy.callCount, 1)
    const callArgs = replySpy.firstCall.args[0]
    const body = JSON.parse(callArgs.data)
    // there should be three filters, none should be duplicates
    assert.deepEqual(body.aggs.education_level10.filter, {
      bool: {
        must: [
          {
            nested: {
              path:  "program.courses",
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        "program.courses.course_title": "Digital Learning 200"
                      }
                    },
                    {
                      range: {
                        "program.courses.final_grade": {
                          gte: "40",
                          lte: "100"
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          {
            term: {
              "program.id": 3
            }
          }
        ]
      }
    })
  })

  it("navigates between the learner search page and the profile page without error", async () => {
    await renderSearch()
    await listenForActions(
      [REQUEST_DASHBOARD, RECEIVE_DASHBOARD_SUCCESS],
      () => {
        browserHistory.push(`/learner/${SETTINGS.user.username}`)
      }
    )
    browserHistory.push("/learners")
    browserHistory.push(`/learner/${SETTINGS.user.username}`)
  })
})

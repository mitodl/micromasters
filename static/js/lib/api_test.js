/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import Decimal from "decimal.js-light"
import R from "ramda"

import {
  getUserProfile,
  patchUserProfile,
  getDashboard,
  getCoursePrices,
  checkout,
  sendSearchResultMail,
  sendCourseTeamMail,
  sendLearnerMail,
  getPrograms,
  addProgramEnrollment,
  updateProfileImage,
  addFinancialAid,
  skipFinancialAid,
  updateDocumentSentDate,
  addCourseEnrollment,
  getCoupons,
  attachCoupon,
  getPearsonSSO
} from "./api"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import {
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_CONTENT_TYPE_PROGRAM
} from "../constants"
import {
  COUPON,
  CYBERSOURCE_CHECKOUT_RESPONSE,
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE,
  USER_PROFILE_RESPONSE,
  PROGRAMS
} from "../test_constants"
import { makeSSOParameters } from "../factories/pearson"

describe("api", function() {
  this.timeout(5000) // eslint-disable-line no-invalid-this

  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })
  afterEach(function() {
    sandbox.restore()

    for (let cookie of document.cookie.split(";")) {
      let key = cookie.split("=")[0].trim()
      document.cookie = `${key}=`
    }
  })

  describe("REST functions", () => {
    let fetchJSONStub
    let fetchStub
    beforeEach(() => {
      fetchJSONStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
      fetchStub = sandbox.stub(fetchFuncs, "fetchWithCSRF")
    })

    it("gets user profile", () => {
      fetchJSONStub.returns(Promise.resolve(USER_PROFILE_RESPONSE))
      return getUserProfile("jane").then(receivedUserProfile => {
        assert.ok(fetchJSONStub.calledWith("/api/v0/profiles/jane/"))
        assert.deepEqual(receivedUserProfile, USER_PROFILE_RESPONSE)
      })
    })

    it("fails to get user profile", () => {
      fetchJSONStub.returns(Promise.reject())

      return assert.isRejected(getUserProfile("jane")).then(() => {
        assert.ok(fetchJSONStub.calledWith("/api/v0/profiles/jane/"))
      })
    })

    it("patches a user profile", () => {
      fetchJSONStub.returns(Promise.resolve(USER_PROFILE_RESPONSE))
      patchUserProfile("jane", USER_PROFILE_RESPONSE).then(returnedProfile => {
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/profiles/jane/", {
            method: "PATCH",
            body:   JSON.stringify(USER_PROFILE_RESPONSE)
          })
        )
        assert.deepEqual(returnedProfile, USER_PROFILE_RESPONSE)
      })
    })

    it("fails to patch a user profile", () => {
      fetchJSONStub.returns(Promise.reject())
      return assert
        .isRejected(patchUserProfile("jane", USER_PROFILE_RESPONSE))
        .then(() => {
          let profileWithoutImage = { ...USER_PROFILE_RESPONSE }
          delete profileWithoutImage["image"]
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/profiles/jane/", {
              method: "PATCH",
              body:   JSON.stringify(profileWithoutImage)
            })
          )
        })
    })

    describe("updating profile image", () => {
      const checkArgs = () => {
        let [url, obj] = fetchStub.args[0]
        assert.equal(url, "/api/v0/profiles/jane/")
        assert.equal(obj.method, "PATCH")
        let img = obj.body.get("image")
        assert.equal(img.name, "a file name")
        assert.equal(img.constructor.name, "File")
      }

      it("updates a user profile image", () => {
        let blob = new Blob()
        let formData = new FormData()
        formData.append("image", blob, "a file name")
        fetchStub.returns(Promise.resolve("good response"))
        return updateProfileImage("jane", blob, "a file name").then(res => {
          assert.equal(res, "good response")
          checkArgs()
        })
      })

      it("fails to update a user profile image", () => {
        let blob = new Blob()
        fetchStub.returns(Promise.reject())
        return assert
          .isRejected(updateProfileImage("jane", blob, "a file name"))
          .then(() => {
            checkArgs()
          })
      })
    })

    describe("dashboard API", () => {
      it("gets the dashboard", () => {
        fetchJSONStub.returns(Promise.resolve(DASHBOARD_RESPONSE))
        return getDashboard("beep").then(dashboard => {
          assert.ok(fetchJSONStub.calledWith("/api/v0/dashboard/beep/"))
          assert.deepEqual(dashboard, DASHBOARD_RESPONSE)
        })
      })

      it("fails to get the dashboard", () => {
        fetchJSONStub.returns(Promise.reject())

        return assert.isRejected(getDashboard("user")).then(() => {
          assert.ok(fetchJSONStub.calledWith("/api/v0/dashboard/user/"))
        })
      })

      for (let statusCode of [400, 401]) {
        it(`redirects to login if status = ${statusCode}`, () => {
          fetchJSONStub.returns(Promise.reject({ errorStatusCode: statusCode }))

          return getDashboard().then(() => {
            const redirectUrl = `/logout?next=${encodeURIComponent(
              "/login/edxorg/"
            )}`
            assert.include(window.location.toString(), redirectUrl)
          })
        })
      }
    })

    it("gets course prices", () => {
      fetchJSONStub.returns(Promise.resolve(COURSE_PRICES_RESPONSE))
      return getCoursePrices("username").then(coursePrices => {
        assert.ok(fetchJSONStub.calledWith("/api/v0/course_prices/username/"))
        assert.deepEqual(coursePrices, COURSE_PRICES_RESPONSE)
      })
    })

    it("posts to checkout", () => {
      fetchJSONStub.returns(Promise.resolve(CYBERSOURCE_CHECKOUT_RESPONSE))
      return checkout("course_id").then(checkoutInfo => {
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/checkout/", {
            method: "POST",
            body:   JSON.stringify({ course_id: "course_id" })
          })
        )
        assert.deepEqual(checkoutInfo, CYBERSOURCE_CHECKOUT_RESPONSE)
      })
    })

    it("fails to post to checkout", () => {
      fetchJSONStub.returns(Promise.reject())

      return assert.isRejected(checkout("course_id")).then(() => {
        assert.ok(
          fetchJSONStub.calledWith("/api/v0/checkout/", {
            method: "POST",
            body:   JSON.stringify({ course_id: "course_id" })
          })
        )
      })
    })

    describe("for email", () => {
      let MAIL_RESPONSE = { errorStatusCode: 200 }
      let searchRequest = { size: 50 }
      let courseId = 123
      let learnerStudentId = 123

      it("returns expected values when a POST to send a search result email succeeds", () => {
        fetchJSONStub.returns(Promise.resolve(MAIL_RESPONSE))
        return sendSearchResultMail(
          "subject",
          "body",
          searchRequest
        ).then(mailResp => {
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/mail/search/", {
              method: "POST",
              body:   JSON.stringify({
                email_subject:  "subject",
                email_body:     "body",
                search_request: searchRequest
              })
            })
          )
          assert.deepEqual(mailResp, MAIL_RESPONSE)
        })
      })

      it("returns expected values when a POST to send a course team email succeeds", () => {
        fetchJSONStub.returns(Promise.resolve(MAIL_RESPONSE))
        return sendCourseTeamMail(
          "subject",
          "body",
          courseId
        ).then(mailResp => {
          assert.ok(
            fetchJSONStub.calledWith(`/api/v0/mail/course/${courseId}/`, {
              method: "POST",
              body:   JSON.stringify({
                email_subject: "subject",
                email_body:    "body"
              })
            })
          )
          assert.deepEqual(mailResp, MAIL_RESPONSE)
        })
      })

      it("returns expected values when a POST to send a learner email succeeds", () => {
        fetchJSONStub.returns(Promise.resolve(MAIL_RESPONSE))
        return sendLearnerMail(
          "subject",
          "body",
          learnerStudentId
        ).then(mailResp => {
          sinon.assert.calledWith(
            fetchJSONStub,
            `/api/v0/mail/learner/${learnerStudentId}/`,
            {
              method: "POST",
              body:   JSON.stringify({
                email_subject: "subject",
                email_body:    "body"
              })
            }
          )
          assert.deepEqual(mailResp, MAIL_RESPONSE)
        })
      })

      it("returns a rejected Promise when a POST to any email sending function fails", () => {
        fetchJSONStub.returns(Promise.reject())
        return assert.isRejected(
          sendSearchResultMail("subject", "body", searchRequest)
        )
      })
    })

    describe("for program enrollments", () => {
      it("fetches program enrollments successfully", () => {
        fetchJSONStub.returns(Promise.resolve(PROGRAMS))
        return getPrograms().then(enrollments => {
          assert.ok(fetchJSONStub.calledWith("/api/v0/programs/"))
          assert.deepEqual(enrollments, PROGRAMS)
        })
      })

      it("fails to fetch program enrollments", () => {
        fetchJSONStub.returns(Promise.reject())

        return assert.isRejected(getPrograms()).then(() => {
          assert.ok(fetchJSONStub.calledWith("/api/v0/programs/"))
        })
      })

      for (let statusCode of [400, 401]) {
        it(`redirects to login if status = ${statusCode}`, () => {
          fetchJSONStub.returns(Promise.reject({ errorStatusCode: statusCode }))

          return getPrograms().then(() => {
            const redirectUrl = `/logout?next=${encodeURIComponent(
              "/login/edxorg/"
            )}`
            assert.include(window.location.toString(), redirectUrl)
          })
        })
      }

      it("adds a program enrollment successfully", () => {
        let enrollment = PROGRAMS[0]
        fetchJSONStub.returns(Promise.resolve(enrollment))
        return addProgramEnrollment(enrollment.id).then(enrollmentResponse => {
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/enrolledprograms/", {
              method: "POST",
              body:   JSON.stringify({ program_id: enrollment.id })
            })
          )
          assert.deepEqual(enrollmentResponse, enrollment)
        })
      })

      it("fails to add a program enrollment", () => {
        fetchJSONStub.returns(Promise.reject())
        let enrollment = PROGRAMS[0]

        return assert
          .isRejected(addProgramEnrollment(enrollment.id))
          .then(() => {
            assert.ok(
              fetchJSONStub.calledWith("/api/v0/enrolledprograms/", {
                method: "POST",
                body:   JSON.stringify({ program_id: enrollment.id })
              })
            )
          })
      })
    })

    describe("for adding financial aid", () => {
      it("add financial aid successfully", () => {
        let programId = PROGRAMS[0].id
        fetchJSONStub.returns(Promise.resolve())

        return addFinancialAid(10000, "USD", programId).then(() => {
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/financial_aid_request/", {
              method: "POST",
              body:   JSON.stringify({
                original_income:   10000,
                original_currency: "USD",
                program_id:        3
              })
            })
          )
        })
      })

      it("fails to add financial aid", () => {
        fetchJSONStub.returns(Promise.reject())

        let programId = PROGRAMS[0].id

        return assert
          .isRejected(addFinancialAid(10000, "USD", programId))
          .then(() => {
            assert.ok(
              fetchJSONStub.calledWith("/api/v0/financial_aid_request/", {
                method: "POST",
                body:   JSON.stringify({
                  original_income:   10000,
                  original_currency: "USD",
                  program_id:        3
                })
              })
            )
          })
      })
    })

    describe("for skipping financial aid", () => {
      let programId = 2
      it("successfully skips financial aid", () => {
        fetchJSONStub.returns(Promise.resolve())

        return skipFinancialAid(programId).then(() => {
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/financial_aid_skip/2/", {
              method: "PATCH"
            })
          )
        })
      })

      it("fails to skip financial aid", () => {
        fetchJSONStub.returns(Promise.reject())

        return assert.isRejected(skipFinancialAid(programId)).then(() => {
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/financial_aid_skip/2/", {
              method: "PATCH"
            })
          )
        })
      })
    })

    describe("for updating document sent date", () => {
      it("add updates the document sent date", () => {
        let financialAidId = 123
        let sentDate = "2012-12-12"
        fetchJSONStub.returns(Promise.resolve())

        return updateDocumentSentDate(financialAidId, sentDate).then(() => {
          assert.ok(
            fetchJSONStub.calledWith(
              `/api/v0/financial_aid/${financialAidId}/`,
              {
                method: "PATCH",
                body:   JSON.stringify({
                  date_documents_sent: sentDate
                })
              }
            )
          )
        })
      })

      it("fails to update the document sent date", () => {
        fetchJSONStub.returns(Promise.reject())

        let financialAidId = 123
        let sentDate = "2012-12-12"

        return assert
          .isRejected(updateDocumentSentDate(financialAidId, sentDate))
          .then(() => {
            assert.ok(
              fetchJSONStub.calledWith(
                `/api/v0/financial_aid/${financialAidId}/`,
                {
                  method: "PATCH",
                  body:   JSON.stringify({
                    date_documents_sent: sentDate
                  })
                }
              )
            )
          })
      })
    })

    describe("adding a course enrollment", () => {
      it("adds a course enrollment", () => {
        fetchJSONStub.returns(Promise.resolve())

        let courseId = "course_id"
        return addCourseEnrollment(courseId).then(() => {
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/course_enrollments/", {
              method: "POST",
              body:   JSON.stringify({
                course_id: courseId
              })
            })
          )
        })
      })

      it("fails to add a course enrollment", () => {
        fetchJSONStub.returns(Promise.reject())

        let courseId = "course_id"
        return assert.isRejected(addCourseEnrollment(courseId)).then(() => {
          assert.ok(
            fetchJSONStub.calledWith("/api/v0/course_enrollments/", {
              method: "POST",
              body:   JSON.stringify({
                course_id: courseId
              })
            })
          )
        })
      })
    })

    describe("fetching a coupon", () => {
      it("fetches coupons", () => {
        fetchJSONStub.returns(Promise.resolve([COUPON]))

        return getCoupons().then(coupons => {
          assert.ok(fetchJSONStub.calledWith("/api/v0/coupons/"))
          assert.deepEqual(coupons, [COUPON])
        })
      })

      it("parses response correctly", () => {
        const apiCoupon = {
          amount:       "0.55",
          amount_type:  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
          content_type: COUPON_CONTENT_TYPE_PROGRAM,
          coupon_code:  "success-coupon",
          object_id:    3,
          program_id:   3
        }
        fetchJSONStub.returns(Promise.resolve([apiCoupon]))

        return getCoupons().then(coupons => {
          const coupon = coupons[0]
          assert.instanceOf(coupon.amount, Decimal)
          assert.equal(coupon.amount.toString(), apiCoupon.amount)
          // everything else aside from `amount` should be identical
          const couponProps = R.omit(["amount"], coupon)
          const apiCouponProps = R.omit(["amount"], apiCoupon)
          assert.deepEqual(couponProps, apiCouponProps)
        })
      })

      it("fails to fetch coupons", () => {
        fetchJSONStub.returns(Promise.reject())

        return assert.isRejected(getCoupons()).then(() => {
          assert.ok(fetchJSONStub.calledWith("/api/v0/coupons/"))
        })
      })
    })

    describe("attaching a coupon", () => {
      it("attaches a coupon", () => {
        fetchJSONStub.returns(Promise.resolve())

        let code = "a b"
        return attachCoupon(code).then(() => {
          assert.ok(
            fetchJSONStub.calledWith(
              `/api/v0/coupons/${encodeURI(code)}/users/`,
              {
                method: "POST",
                body:   JSON.stringify({
                  username: SETTINGS.user.username
                })
              }
            )
          )
        })
      })

      it("parses response correctly", () => {
        const apiResponse = {
          message: "Attached user to coupon successfully.",
          coupon:  {
            amount:       "0.55",
            amount_type:  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
            content_type: COUPON_CONTENT_TYPE_PROGRAM,
            coupon_code:  "success-coupon",
            object_id:    3,
            program_id:   3
          }
        }
        fetchJSONStub.returns(Promise.resolve(apiResponse))

        return attachCoupon("success-coupon").then(resp => {
          assert.equal(apiResponse.message, resp.message)
          const coupon = resp.coupon,
            apiCoupon = apiResponse.coupon
          assert.instanceOf(coupon.amount, Decimal)
          assert.equal(coupon.amount.toString(), apiCoupon.amount)
          // everything else aside from `amount` should be identical
          const couponProps = R.omit(["amount"], coupon)
          const apiCouponProps = R.omit(["amount"], apiCoupon)
          assert.deepEqual(couponProps, apiCouponProps)
        })
      })

      it("fails to attach a coupon", () => {
        fetchJSONStub.returns(Promise.reject())

        let code = "a b"
        return assert.isRejected(attachCoupon(code)).then(() => {
          assert.ok(
            fetchJSONStub.calledWith(
              `/api/v0/coupons/${encodeURI(code)}/users/`,
              {
                method: "POST",
                body:   JSON.stringify({
                  username: SETTINGS.user.username
                })
              }
            )
          )
        })
      })
    })

    describe("Pearson API functions", () => {
      describe("getPearsonSSO", () => {
        it("fetches the pearson sso parameters", () => {
          let params = makeSSOParameters()
          fetchJSONStub.returns(Promise.resolve(params))

          return getPearsonSSO().then(() => {
            assert(fetchJSONStub.calledWith("/api/v0/pearson/sso/"))
          })
        })

        it("fails to fetch the pearson sso parameters", () => {
          fetchJSONStub.returns(Promise.reject())

          return assert.isRejected(getPearsonSSO()).then(() => {
            assert(fetchJSONStub.calledWith("/api/v0/pearson/sso/"))
          })
        })
      })
    })
  })
})

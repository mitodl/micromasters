// @flow
/* eslint-disable no-unused-vars */
import Decimal from "decimal.js-light"
import React from "react"
import PropTypes from "prop-types"
import { mount } from "enzyme"
import moment from "moment"
import { assert } from "chai"
import _ from "lodash"
import sinon from "sinon"

import { calculatePrices } from "../../lib/coupon"
import CourseListCard from "./CourseListCard"
import CourseRow from "./CourseRow"
import {
  DASHBOARD_RESPONSE,
  COURSE_PRICES_RESPONSE
} from "../../test_constants"
import { INITIAL_EMAIL_STATE } from "../../reducers/email"
import { INITIAL_UI_STATE } from "../../reducers/ui"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import IntegrationTestHelper from "../../util/integration_test_helper"
import { Provider } from "react-redux"
import {
  receiveGetProgramEnrollmentsSuccess,
  setCurrentProgramEnrollment
} from "../../actions/programs"
import {
  FA_STATUS_CREATED,
  FA_STATUS_APPROVED,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  FA_STATUS_PENDING_DOCS
} from "../../constants"
import { makeCoupon, makeCourseCoupon } from "../../factories/dashboard"
import { programBackendName } from "../../util/util"

describe("CourseListCard", () => {
  let program,
    coursePrice,
    sandbox,
    helper,
    routerPushStub,
    openFinancialAidCalculatorStub
  beforeEach(() => {
    program = _.cloneDeep(DASHBOARD_RESPONSE.programs[1])
    coursePrice = _.cloneDeep(
      (COURSE_PRICES_RESPONSE.find(
        coursePrice => coursePrice.program_id === program.id
      ): any)
    )

    assert.isAbove(program.courses.length, 0)
    sandbox = sinon.sandbox.create()
    routerPushStub = sandbox.stub()
    openFinancialAidCalculatorStub = sandbox.spy()
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    sandbox.restore()
    helper.cleanup()
  })

  const changeToFinancialAid = (
    status = FA_STATUS_APPROVED,
    hasUserApplied = true
  ) => {
    program.financial_aid_availability = true
    program.financial_aid_user_info = {
      application_status:  status,
      date_documents_sent: "foo",
      has_user_applied:    hasUserApplied,
      max_possible_cost:   100,
      min_possible_cost:   100,
      id:                  1
    }
    coursePrice.financial_aid_availability = true
  }

  const renderCourseListCard = (props = {}) => {
    helper.store.dispatch(
      receiveGetProgramEnrollmentsSuccess(DASHBOARD_RESPONSE.programs)
    )
    helper.store.dispatch(setCurrentProgramEnrollment(program))

    const couponPrices = calculatePrices([program], [coursePrice], [])
    return mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <Provider store={helper.store}>
          <CourseListCard
            program={program}
            coursePrice={coursePrice}
            addCourseEnrollment={() => Promise.resolve()}
            openFinancialAidCalculator={openFinancialAidCalculatorStub}
            couponPrices={couponPrices}
            ui={INITIAL_UI_STATE}
            openCourseContactDialog={() => undefined}
            closeEmailDialog={() => undefined}
            updateEmailEdit={() => undefined}
            sendEmail={() => undefined}
            emailDialogVisibility={false}
            email={INITIAL_EMAIL_STATE}
            setEnrollCourseDialogVisibility={() => undefined}
            setEnrollSelectedCourseRun={() => undefined}
            setCalculatePriceDialogVisibility={() => undefined}
            checkout={() => undefined}
            setShowExpandedCourseStatus={() => undefined}
            setShowGradeDetailDialog={() => undefined}
            showStaffView={false}
            {...props}
          />
        </Provider>
      </MuiThemeProvider>,
      {
        context:           { router: { push: routerPushStub } },
        childContextTypes: {
          router: PropTypes.object.isRequired
        }
      }
    )
  }

  describe("pricing message", () => {
    describe("with financial aid", () => {
      it(" does not require applying for financial aid", () => {
        changeToFinancialAid(FA_STATUS_CREATED, false)
        const wrapper = renderCourseListCard()
        const messageEl = wrapper.find(".price-message")
        assert.lengthOf(messageEl, 1)
        assert.include(
          messageEl.text(),
          "To get credit for the courses in this program, you must pay for a verified certificate from"
        )
      })

      it("does not display price with both coupon and financial aid", () => {
        changeToFinancialAid(FA_STATUS_APPROVED, true)
        const coupon = makeCoupon(program)
        coupon.amount_type = COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT
        coupon.amount = new Decimal("1")
        const couponPrices = calculatePrices([program], [coursePrice], [coupon])
        const wrapper = renderCourseListCard({ couponPrices })
        const messageEl = wrapper.find(".price-message")
        assert.lengthOf(messageEl, 1)
        assert.include(
          messageEl.text(),
          "To get credit for the courses in this program, you must pay for a verified certificate from"
        )
      })
    })
  })

  it("creates a CourseRow for each course", () => {
    const now = moment()
    const prices = calculatePrices([program], [coursePrice], [])
    const wrapper = renderCourseListCard({
      now:    now,
      prices: prices
    })
    assert.equal(wrapper.find(CourseRow).length, program.courses.length)
    const courses = _.sortBy(program.courses, "position_in_program")
    wrapper.find(CourseRow).forEach((courseRow, i) => {
      const props = courseRow.props()
      assert.equal(props.now, now)
      assert.deepEqual(props.couponPrices, prices)
      assert.deepEqual(props.course, courses[i])
    })
  })

  it("fills in now if it's missing in the props", () => {
    const wrapper = renderCourseListCard()
    const nows = wrapper.find(CourseRow).map(courseRow => courseRow.props().now)
    assert.isAbove(nows.length, 0)
    for (const now of nows) {
      // Each now must be exactly the same object
      assert.equal(now, nows[0])
    }
  })

  it("doesn't show the personalized pricing box for programs without it", () => {
    program.financial_aid_availability = false
    const wrapper = renderCourseListCard()
    assert.equal(wrapper.find(".personalized-pricing").length, 0)
  })

  describe("staff view mode", () => {
    it("should have the program title in the card title", () => {
      const wrapper = renderCourseListCard({ showStaffView: true })
      assert.equal(wrapper.find("h2").text(), `Courses - ${program.title}`)
    })

    it("should pass the showStaffView to relevant child components", () => {
      const wrapper = renderCourseListCard({ showStaffView: true })
      wrapper.find(CourseRow).forEach(row => {
        assert.isTrue(row.props().showStaffView)
      })
    })
  })
})

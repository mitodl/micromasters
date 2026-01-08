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

describe("CourseListCard", () => {
  let program, coursePrice, sandbox, helper, routerPushStub

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
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    sandbox.restore()
    helper.cleanup()
  })

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
            couponPrices={couponPrices}
            ui={INITIAL_UI_STATE}
            openCourseContactDialog={() => undefined}
            closeEmailDialog={() => undefined}
            updateEmailEdit={() => undefined}
            sendEmail={() => undefined}
            emailDialogVisibility={false}
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

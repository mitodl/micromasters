// @flow
import React from "react"
import Decimal from "decimal.js-light"
import { mount } from "enzyme"
import { assert } from "chai"
import sinon from "sinon"
import ReactTestUtils from "react-dom/test-utils"

import {
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_PRICE,
  COUPON_TYPE_STANDARD
} from "../constants"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import CouponNotificationDialog from "./CouponNotificationDialog"
import type { Coupon } from "../flow/couponTypes"
import type { AvailableProgram } from "../flow/enrollmentTypes"
import type { Course } from "../flow/programTypes"
import { getEl } from "../util/test_utils"

const COUPON_FIXED_DISCOUNT: Coupon = {
  coupon_code:  "fixed-discount",
  coupon_type:  COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_PROGRAM,
  amount_type:  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  amount:       new Decimal("123.45"),
  program_id:   1,
  object_id:    1
}

const COUPON_PERCENT: Coupon = {
  coupon_code:  "percent",
  coupon_type:  COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_PROGRAM,
  amount_type:  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  amount:       new Decimal("0.5543"),
  program_id:   1,
  object_id:    1
}

const COUPON_FIXED_PRICE: Coupon = {
  coupon_code:  "fixed-price",
  coupon_type:  COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_PROGRAM,
  amount_type:  COUPON_AMOUNT_TYPE_FIXED_PRICE,
  amount:       new Decimal("150"),
  program_id:   1,
  object_id:    1
}

const COUPON_COURSE: Coupon = {
  coupon_code:  "course",
  coupon_type:  COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_COURSE,
  amount_type:  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  amount:       new Decimal("1"),
  program_id:   1,
  object_id:    2
}

const COURSE: Course = {
  id:                          2,
  title:                       "Horse",
  has_contact_email:           false,
  position_in_program:         1,
  runs:                        [],
  can_schedule_exam:           false,
  exam_url:                    "",
  exams_schedulable_in_future: [],
  past_exam_date:              "",
  has_to_pay:                  false,
  has_exam:                    false,
  proctorate_exams_grades:     [],
  is_elective:                 false,
  certificate_url:             "",
  overall_grade:               ""
}

const PROGRAM: AvailableProgram = {
  id:              1,
  title:           "Awesomesauce",
  enrolled:        true,
  programpage_url: null,
  total_courses:   0
}

describe("CouponNotificationDialog", () => {
  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderDialog = (
    coupon: Coupon,
    couponProgram: ?AvailableProgram = null,
    couponCourse: ?Course = null,
    open = true,
    setDialogVisibility = () => {}
  ): HTMLElement => {
    mount(
      <MuiThemeProvider theme={createMuiTheme()}>
        <CouponNotificationDialog
          coupon={coupon}
          couponProgram={couponProgram}
          couponCourse={couponCourse}
          open={open}
          setDialogVisibility={setDialogVisibility}
        />
      </MuiThemeProvider>
    )
    return getEl(document, ".coupon-notification-dialog")
  }

  it("renders with a fixed coupon", () => {
    const div = renderDialog(COUPON_FIXED_DISCOUNT, PROGRAM)
    const titleEl = getEl(div, ".dialog-title")
    assert.equal(
      titleEl.textContent,
      "Coupon applied: $123.45 off each course!"
    )
    const messageEl = getEl(div, "p:first-child")
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of $123.45 off the price of each course in the Awesomesauce MicroMasters program."
    )
  })

  it("renders with a percentage coupon", () => {
    const div = renderDialog(COUPON_PERCENT, PROGRAM)
    const titleEl = getEl(div, ".dialog-title")
    assert.equal(titleEl.textContent, "Coupon applied: 55% off each course!")
    const messageEl = getEl(div, "p:first-child")
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 55% off the price of each course in the Awesomesauce MicroMasters program."
    )
  })

  it("falls back on program ID when program is not present", () => {
    const div = renderDialog(COUPON_PERCENT)
    const titleEl = getEl(div, ".dialog-title")
    assert.equal(titleEl.textContent, "Coupon applied: 55% off each course!")
    const messageEl = getEl(div, "p:first-child")
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 55% off the price of each course in program ID 1."
    )
  })

  it("renders with a course coupon", () => {
    const div = renderDialog(COUPON_COURSE, PROGRAM, COURSE)
    const titleEl = getEl(div, ".dialog-title")
    assert.equal(titleEl.textContent, "Coupon applied: 100% off!")
    const messageEl = getEl(div, "p:first-child")
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 100% off the price of Horse."
    )
  })

  it("falls back on the course ID when course is not present", () => {
    const div = renderDialog(COUPON_COURSE, PROGRAM)
    const titleEl = getEl(div, ".dialog-title")
    assert.equal(titleEl.textContent, "Coupon applied: 100% off!")
    const messageEl = getEl(div, "p:first-child")
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 100% off the price of course ID 2."
    )
  })

  it("renders a fixed price coupon", () => {
    const div = renderDialog(COUPON_FIXED_PRICE, PROGRAM)
    const titleEl = getEl(div, ".dialog-title")
    assert.equal(
      titleEl.textContent,
      "Coupon applied: course price set to $150"
    )
    const messageEl = getEl(div, "p:first-child")
    assert.equal(
      messageEl.textContent,
      "This coupon sets the price of each course in the " +
        "Awesomesauce MicroMasters program at the fixed price of $150."
    )
  })

  it("has an OK button", () => {
    const callback = sandbox.stub()
    const div = renderDialog(COUPON_PERCENT, PROGRAM, null, true, callback)
    const buttonEl = getEl(div, "button.primary-button")
    assert.equal(buttonEl.textContent, "OK")
    ReactTestUtils.Simulate.click(buttonEl)
    assert.isTrue(callback.calledWith(false))
  })
})

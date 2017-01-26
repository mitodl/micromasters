// @flow
import React from 'react';
import Decimal from 'decimal.js-light';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import TestUtils from 'react-addons-test-utils';

import {
  COUPON_CONTENT_TYPE_COURSE,
  COUPON_CONTENT_TYPE_PROGRAM,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  COUPON_TYPE_STANDARD,
} from '../constants';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import CouponNotificationDialog from './CouponNotificationDialog';
import type { Coupon } from '../flow/couponTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import type { Course } from '../flow/programTypes';

const COUPON_FIXED: Coupon = {
  coupon_code: "fixed",
  coupon_type: COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_PROGRAM,
  amount_type: COUPON_AMOUNT_TYPE_FIXED_DISCOUNT,
  amount: new Decimal('123.45'),
  program_id: 1,
  object_id: 1,
};

const COUPON_PERCENT: Coupon = {
  coupon_code: "percent",
  coupon_type: COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_PROGRAM,
  amount_type: COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  amount: new Decimal('0.5543'),
  program_id: 1,
  object_id: 1,
};

const COUPON_COURSE: Coupon = {
  coupon_code: "course",
  coupon_type: COUPON_TYPE_STANDARD,
  content_type: COUPON_CONTENT_TYPE_COURSE,
  amount_type: COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  amount: new Decimal('1'),
  program_id: 1,
  object_id: 2,
};

const COURSE: Course = {
  id: 2,
  title: "Horse",
  position_in_program: 1,
  runs: []
};

const PROGRAM: AvailableProgram = {
  id: 1,
  title: "Awesomesauce",
  enrolled: true,
  programpage_url: null,
};


describe("CouponNotificationDialog", () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderDialog = (
    coupon: Coupon,
    couponProgram: ?AvailableProgram = null,
    couponCourse: ?Course = null,
    open = true,
    setDialogVisibility = () => {},
  ) => {
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <CouponNotificationDialog
          coupon={coupon}
          couponProgram={couponProgram}
          couponCourse={couponCourse}
          open={open}
          setDialogVisibility={setDialogVisibility}
        />
      </MuiThemeProvider>
    );
    return document.querySelector('.coupon-notification-dialog');
  };

  it('renders with a fixed coupon', () => {
    const div = renderDialog(COUPON_FIXED, PROGRAM);
    const titleEl = div.querySelector(".dialog-title");
    assert.equal(titleEl.textContent, "Coupon applied: $123.45 off each course!");
    const messageEl = div.querySelector("p:first-child");
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of $123.45 off the price of each course in the Awesomesauce MicroMasters program."
    );
  });

  it('renders with a percentage coupon', () => {
    const div = renderDialog(COUPON_PERCENT, PROGRAM);
    const titleEl = div.querySelector(".dialog-title");
    assert.equal(titleEl.textContent, "Coupon applied: 55% off each course!");
    const messageEl = div.querySelector("p:first-child");
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 55% off the price of each course in the Awesomesauce MicroMasters program."
    );
  });

  it('falls back on program ID when program is not present', () => {
    const div = renderDialog(COUPON_PERCENT);
    const titleEl = div.querySelector(".dialog-title");
    assert.equal(titleEl.textContent, "Coupon applied: 55% off each course!");
    const messageEl = div.querySelector("p:first-child");
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 55% off the price of each course in program ID 1."
    );
  });

  it('renders with a course coupon', () => {
    const div = renderDialog(COUPON_COURSE, PROGRAM, COURSE);
    const titleEl = div.querySelector(".dialog-title");
    assert.equal(titleEl.textContent, "Coupon applied: 100% off!");
    const messageEl = div.querySelector("p:first-child");
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 100% off the price of Horse in the Awesomesauce MicroMasters program."
    );
  });

  it('falls back on the course ID when course is not present', () => {
    const div = renderDialog(COUPON_COURSE, PROGRAM);
    const titleEl = div.querySelector(".dialog-title");
    assert.equal(titleEl.textContent, "Coupon applied: 100% off!");
    const messageEl = div.querySelector("p:first-child");
    assert.equal(
      messageEl.textContent,
      "This coupon gives a discount of 100% off the price of course ID 2 in the Awesomesauce MicroMasters program."
    );
  });

  it('has an OK button', () => {
    const callback = sandbox.stub();
    const div = renderDialog(COUPON_PERCENT, PROGRAM, null, true, callback);
    const buttonEl = div.querySelector("button.primary-button");
    assert.equal(buttonEl.textContent, "OK");
    TestUtils.Simulate.click(buttonEl);
    assert.isTrue(callback.calledWith(false));
  });
});

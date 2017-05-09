// @flow
import React from 'react';
import Decimal from 'decimal.js-light';
import { mount } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import TestUtils from 'react-addons-test-utils';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import CourseEnrollmentDialog from './CourseEnrollmentDialog';
import { makeCourse, makeRun } from '../factories/dashboard';
import { getEl } from '../util/test_utils';

describe("CourseEnrollmentDialog", () => {
  let sandbox, setVisibilityStub, addCourseEnrollmentStub, routerPushStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    setVisibilityStub = sandbox.spy();
    addCourseEnrollmentStub = sandbox.spy();
    routerPushStub = sandbox.spy();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderDialog = (
    price = null,
    courseRun = makeRun(1),
    course = makeCourse(1),
    open = true,
  ) => {
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <CourseEnrollmentDialog
          open={open}
          course={course}
          courseRun={courseRun}
          price={price}
          setVisibility={setVisibilityStub}
          addCourseEnrollment={addCourseEnrollmentStub}
        />
      </MuiThemeProvider>,
      {
        context: { router: { push: routerPushStub}},
        childContextTypes: {
          router:   React.PropTypes.object.isRequired
        }
      },
    );
    let el: HTMLElement = (document.querySelector('.course-enrollment-dialog'): any);
    return el;
  };

  it('can render without price', () => {
    const wrapper = renderDialog();
    const payButton = ((wrapper.querySelector('.pay-button'): any): HTMLButtonElement);
    assert.equal(payButton.textContent, "Pay Now");
    assert.isTrue(payButton.disabled);
    const auditButton = getEl(wrapper, '.audit-button');
    assert.equal(auditButton.textContent, "Audit for Free & Pay Later");
  });

  it('can render with price', () => {
    const price = new Decimal("123.45");
    const wrapper = renderDialog(price);
    const payButton = ((wrapper.querySelector('.pay-button'): any): HTMLButtonElement);
    assert.equal(payButton.textContent, "Pay Now ($123.45)");
    assert.isFalse(payButton.disabled);
    const auditButton = getEl(wrapper, '.audit-button');
    assert.equal(auditButton.textContent, "Audit for Free & Pay Later");
  });

  it('has a disabled pay button by default', () => {
    const wrapper = renderDialog();
    const payButton = wrapper.querySelector('.pay-button');
    TestUtils.Simulate.click(payButton);
    sinon.assert.notCalled(setVisibilityStub);
    sinon.assert.notCalled(routerPushStub);
  });

  it('can click pay button with price', () => {
    const price = new Decimal("123.45");
    const courseRun = makeRun(1);
    const wrapper = renderDialog(price, courseRun);
    const payButton = wrapper.querySelector('.pay-button');
    TestUtils.Simulate.click(payButton);
    sinon.assert.calledWith(setVisibilityStub, false);
    const url = `/order_summary/?course_key=${encodeURIComponent(courseRun.course_id)}`;
    sinon.assert.calledWith(routerPushStub, url);
  });

  it('can click audit button', () => {
    const price = new Decimal("123.45");
    const courseRun = makeRun(1);
    const wrapper = renderDialog(price, courseRun);
    const auditButton = wrapper.querySelector('.audit-button');
    TestUtils.Simulate.click(auditButton);
    sinon.assert.calledWith(setVisibilityStub, false);
    sinon.assert.calledWith(addCourseEnrollmentStub, courseRun.course_id);
  });
});

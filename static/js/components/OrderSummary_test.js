
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';

import OrderSummary from './OrderSummary';
import { FETCH_PROCESSING } from '../actions';

import {
  COURSE_PRICES_RESPONSE,
} from '../test_constants';
import {
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
} from '../constants';
import {
  findCourse,
} from '../util/test_utils';


describe('CourseAction', () => {
  let sandbox, checkoutStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    checkoutStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let getElements = (renderedComponent) => {
    let button = renderedComponent.find(".continue-payment");
    let buttonText;
    if (button.length > 0 && button.children().length > 0) {
      buttonText = button.children().text();
    }
    let explanation = renderedComponent.find(".payment-explanation");
    let explanationText = explanation.length === 1 ? explanation.text() : undefined;
    return {
      button: button,
      buttonText: buttonText,
      explanationText: explanationText,
    };
  };

  let assertCheckoutButton = (button, courseId) => {
    button.simulate('click');
    assert.isAbove(checkoutStub.callCount, 0);
    assert.deepEqual(checkoutStub.args[0], [courseId]);
  };

  let renderOrderSummary = (props = {}) => {
    return shallow(
      <OrderSummary
        checkout={checkoutStub}
        coursePrice={COURSE_PRICES_RESPONSE[1]}
        courseRun={null}
        {...props}
      />
    );
  };
  it('shows a message if a user is redirected for checkout when price is above 0', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    let firstRun = course.runs[0];
    const wrapper = renderOrderSummary({
      courseRun: firstRun,
      course: course
    });
    let elements = getElements(wrapper);

    assert.isUndefined(elements.button.props().disabled);
    assert.include(elements.buttonText, 'Continue');
    assert.include(elements.explanationText, 'outside of the MIT');
    assertCheckoutButton(elements.button, firstRun.course_id);
  });

  it('shows a message if a user skips checkout when price is 0', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_OFFERED
    ));
    let firstRun = course.runs[0];
    const wrapper = renderOrderSummary({
      courseRun: firstRun,
      course: course,
      coursePrice: 0
    });
    let elements = getElements(wrapper);

    assert.isUndefined(elements.button.props().disabled);
    assert.include(elements.buttonText, 'Continue');
    assert.include(elements.explanationText, 'skip the normal payment');
    assertCheckoutButton(elements.button, firstRun.course_id);
  });


  it('shows a spinner in place of the continue while API call is in progress', () => {
    let course = findCourse(course => (
      course.runs.length > 0 &&
      course.runs[0].status === STATUS_CAN_UPGRADE
    ));
    let firstRun = course.runs[0];
    const wrapper = renderOrderSummary({
      courseRun: firstRun,
      course: course,
      checkoutStatus: FETCH_PROCESSING
    });
    let button = wrapper.find(".continue-payment");
    assert.isTrue(button.props().spinning);
  });
});

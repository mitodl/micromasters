/* global SETTINGS: false */
// @flow
import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import { assert } from 'chai';
import sinon from 'sinon';

import CourseAction from './CourseAction';
import {
  DASHBOARD_FORMAT,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
  STATUS_ENROLLED,
  STATUS_VERIFIED,
  STATUS_NOT_OFFERED,
} from '../../constants';
import { findCourse } from './CourseDescription_test';

describe('CourseAction', () => {
  const now = moment();
  let sandbox, checkoutStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    checkoutStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let assertCheckoutButton = (button, courseId) => {
    button.simulate('click');
    assert.equal(checkoutStub.callCount, 1);
    assert.deepEqual(checkoutStub.args[0], [courseId]);
  };

  it('shows a check mark for a passed course', () => {
    let course = findCourse(course => course.status === STATUS_PASSED);
    const wrapper = shallow(<CourseAction course={course} now={now} checkout={checkoutStub}/>);
    assert.equal(wrapper.find(".material-icons").text(), 'done');
  });

  it('shows nothing for a failed course', () => {
    let course = findCourse(course => (
      course.status === STATUS_NOT_OFFERED &&
      course.runs[0].status === STATUS_NOT_PASSED
    ));
    const wrapper = shallow(<CourseAction course={course} now={now} checkout={checkoutStub}/>);
    assert.equal(wrapper.text(), '');
  });

  it('shows nothing for a verified course', () => {
    let course = findCourse(course => course.status === STATUS_VERIFIED);
    const wrapper = shallow(<CourseAction course={course} now={now} checkout={checkoutStub}/>);
    assert.equal(wrapper.text(), '');
  });

  [STATUS_OFFERED, STATUS_ENROLLED].forEach((status) => {
    it(`shows the enroll button followed by course title when status is ${status}`, () => {
      let course = findCourse(course => course.status === status);
      let firstRun = course.runs[0];
      const wrapper = shallow(<CourseAction course={course} now={now} checkout={checkoutStub}/>);
      let buttonContainer = wrapper.find(".course-action-action");

      assert.include(buttonContainer.text(), `<Button /> in ${firstRun.title}`);
    });
  });

  it('shows an upgrade button if user is not verified but is enrolled', () => {
    let course = findCourse(course => course.status === STATUS_ENROLLED);
    const wrapper = shallow(<CourseAction course={course} now={now} checkout={checkoutStub}/>);
    let buttonContainer = wrapper.find(".course-action-action");
    let button = buttonContainer.find(".dashboard-button");
    let buttonText = button.children().text();
    let description = wrapper.find(".course-action-description");
    let firstRun = course.runs[0];

    assert.isUndefined(button.props().disabled);
    assert.equal(buttonText, 'Upgrade');
    assert.equal(description.text(), "");
    assertCheckoutButton(button, firstRun.course_id);
  });

  it('shows a disabled enroll button if user is not enrolled and there is no enrollment date', () => {
    // there should also be text below the button
    let course = findCourse(course => (
      course.status === STATUS_OFFERED &&
      course.runs[0].enrollment_start_date === undefined
    ));
    const wrapper = shallow(<CourseAction course={course} now={now} checkout={checkoutStub}/>);
    let buttonContainer = wrapper.find(".course-action-action");
    let button = buttonContainer.find(".dashboard-button");
    let buttonText = button.children().text();
    let description = wrapper.find(".course-action-description");
    let firstRun = course.runs[0];

    assert.isTrue(button.props().disabled);
    assert.equal(buttonText, 'Enroll');
    assert.equal(description.text(), `Enrollment begins ${firstRun.fuzzy_enrollment_start_date}`);
  });

  it('shows a disabled enroll button if user is not enrolled and enrollment starts in future', () => {
    // there should also be text below the button
    let course = findCourse(course => (
      course.status === STATUS_OFFERED &&
      course.runs[0].enrollment_start_date !== undefined
    ));
    let firstRun = course.runs[0];
    let yesterday = moment(firstRun.enrollment_start_date).add(-1, 'days');
    const wrapper = shallow(<CourseAction course={course} now={yesterday} checkout={checkoutStub}/>);
    let buttonContainer = wrapper.find(".course-action-action");
    let button = buttonContainer.find(".dashboard-button");
    let buttonText = button.children().text();
    let description = wrapper.find(".course-action-description");

    assert.isTrue(button.props().disabled);
    assert.equal(buttonText, 'Enroll');
    let formattedDate = moment(firstRun.enrollment_start_date).format(DASHBOARD_FORMAT);
    assert.equal(description.text(), `Enrollment begins ${formattedDate}`);
  });

  it('shows an enroll button if user is not enrolled and enrollment starts today', () => {
    let course = findCourse(course => (
      course.status === STATUS_OFFERED &&
      course.runs[0].enrollment_start_date !== undefined
    ));
    let firstRun = course.runs[0];
    let today = moment(firstRun.enrollment_start_date);
    const wrapper = shallow(<CourseAction course={course} now={today} checkout={checkoutStub}/>);
    let buttonContainer = wrapper.find(".course-action-action");
    let button = buttonContainer.find(".dashboard-button");
    let buttonText = button.children().text();
    let description = wrapper.find(".course-action-description");

    assert.isUndefined(button.props().disabled);
    assert.equal(buttonText, 'Enroll');
    assert.equal(description.text(), ``);
    assertCheckoutButton(button, firstRun.course_id);
  });

  it('shows an enroll button if user is not enrolled and enrollment started already', () => {
    let course = findCourse(course => (
      course.status === STATUS_OFFERED &&
      course.runs[0].enrollment_start_date !== undefined
    ));
    let firstRun = course.runs[0];
    let tomorrow = moment(firstRun.enrollment_start_date).add(1, 'days');
    const wrapper = shallow(<CourseAction course={course} now={tomorrow} checkout={checkoutStub}/>);
    let buttonContainer = wrapper.find(".course-action-action");
    let button = buttonContainer.find(".dashboard-button");
    let buttonText = button.children().text();
    let description = wrapper.find(".course-action-description");

    assert.isUndefined(button.props().disabled);
    assert.equal(buttonText, 'Enroll');
    assert.equal(description.text(), ``);
    assertCheckoutButton(button, firstRun.course_id);
  });

  it('is not an offered course and user has not failed', () => {
    let course = findCourse(course => (
      course.status === STATUS_NOT_OFFERED &&
      course.runs.length === 0
    ));
    const wrapper = shallow(<CourseAction course={course} now={now} checkout={checkoutStub}/>);
    let buttonContainer = wrapper.find(".course-action-action");
    let description = wrapper.find(".course-action-description");

    assert.equal(buttonContainer.text(), '');
    assert.equal(description.text(), '');
  });
});

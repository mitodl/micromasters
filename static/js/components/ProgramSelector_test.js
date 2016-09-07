import { assert } from 'chai';
import { shallow } from 'enzyme';
import _ from 'lodash';
import React from 'react';
import { ReactPageClick } from 'react-page-click';
import sinon from 'sinon';

import ProgramSelector from './ProgramSelector';
import {
  DASHBOARD_RESPONSE,
} from '../constants';

describe('ProgramSelector', () => {
  let sandbox;
  // define our own enrollments
  const enrollments = DASHBOARD_RESPONSE.map(program => ({
    id: program.id,
    title: program.title,
  }));
  // remove one enrollment so that not all programs are enrolled
  const unenrolled = enrollments.splice(0, 1)[0];
  const selectedEnrollment = enrollments[1];

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderProgramSelector = (props) => {
    return shallow(
      <ProgramSelector
        enrollments={{programEnrollments: enrollments}}
        dashboard={{programs: DASHBOARD_RESPONSE}}
        currentProgramEnrollment={selectedEnrollment}
        {...props}
      />
    );
  };

  it('renders an empty div if there are no program enrollments', () => {
    let wrapper = renderProgramSelector({
      enrollments: {
        programEnrollments: []
      },
    });
    assert.equal(wrapper.find("div").children().length, 0);
  });

  it("renders within a ReactPageClick element if the program selector is open", () => {
    let setProgramSelectorOpen = sandbox.stub();
    let wrapper = renderProgramSelector({
      programSelectorOpen: true,
      setProgramSelectorOpen
    });
    let pageClick = wrapper.find(ReactPageClick);

    // also check that the notify prop will close the selector
    let notify = pageClick.props().notify;
    notify();
    assert(setProgramSelectorOpen.calledWith(false));
  });

  it("renders no ReactPageClick element if the program selector is not open", () => {
    let wrapper = renderProgramSelector({
      programSelectorOpen: false,
    });
    assert(wrapper.find(ReactPageClick).length === 0, "ReactPageClick should not be present");
  });

  it("renders the currently selected enrollment first, then all other enrollments", () => {
    let wrapper = renderProgramSelector();
    assert.equal(wrapper.find(".selected-option").text(), `${selectedEnrollment.title} arrow_drop_down`);

    let sortedEnrollments = _.sortBy(enrollments, 'title');
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, enrollments);
    let text = wrapper.find(".option").map(item => item.text());
    // include 'Enroll in a new program' which comes at the end if user can enroll in a new program
    let expectedEnrollments = sortedEnrollments.
      filter(enrollment => enrollment.id !== selectedEnrollment.id).
      map(enrollment => enrollment.title).
      concat("Enroll in a new program");
    assert.deepEqual(text, expectedEnrollments);
  });

  it("does not render the 'Enroll in a new program' option if there is not at least one available program", () => {
    let allEnrollments = enrollments.concat(unenrolled);
    let wrapper = renderProgramSelector({
      enrollments: {
        programEnrollments: allEnrollments
      }
    });
    let sortedEnrollments = _.sortBy(allEnrollments, 'title');
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, allEnrollments);
    let text = wrapper.find(".option").map(item => item.text());
    let expectedEnrollments = sortedEnrollments.filter(enrollment => enrollment.id !== selectedEnrollment.id).
      map(enrollment => enrollment.title);
    assert.deepEqual(text, expectedEnrollments);
  });

  for (let value of [true, false]) {
    it(`sets the dropdown open value to ${!value}`, () => {
      let setProgramSelectorOpen = sandbox.stub();
      let wrapper = renderProgramSelector({
        setProgramSelectorOpen,
        programSelectorOpen: value
      });
      wrapper.find(".selected-option").simulate('click');
      assert(setProgramSelectorOpen.calledWith(!value), `setProgramSelectorOpen not called with ${!value}`);
    });
  }

  it("shows the enrollment dialog when the 'Enroll in a new program' option is clicked", () => {
    let setEnrollDialogVisibility = sandbox.stub();
    let wrapper = renderProgramSelector({
      setEnrollDialogVisibility,
    });
    wrapper.find(".enroll-new-program").simulate('click');
    assert(setEnrollDialogVisibility.calledWith(true), 'setEnrollDialogVisibility not called with true');
  });

  it("switches to a new current enrollment when a new option is clicked", () => {
    let setCurrentProgramEnrollment = sandbox.stub();
    let setProgramSelectorOpen = sandbox.stub();

    let wrapper = renderProgramSelector({
      setCurrentProgramEnrollment,
      setProgramSelectorOpen,
    });
    let option = wrapper.find(".option").first();
    let newSelectedEnrollment = enrollments.find(enrollment => enrollment.title === option.text());
    option.simulate('click');

    assert(setCurrentProgramEnrollment.calledWith(newSelectedEnrollment));
    assert(setProgramSelectorOpen.calledWith(false));
  });
});

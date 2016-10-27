import { assert } from 'chai';
import { shallow } from 'enzyme';
import _ from 'lodash';
import React from 'react';
import Select from 'react-select';
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
        programs={{programEnrollments: enrollments}}
        dashboard={{programs: DASHBOARD_RESPONSE}}
        currentProgramEnrollment={selectedEnrollment}
        {...props}
      />
    );
  };

  it('renders an empty div if there are no program enrollments', () => {
    let wrapper = renderProgramSelector({
      programs: {
        programEnrollments: []
      },
    });
    assert.equal(wrapper.find("div").children().length, 0);
  });

  it('renders an empty div if it is passed `selectorVisibility === false`', () => {
    let wrapper = renderProgramSelector({ selectorVisibility: false });
    assert.equal(wrapper.find("div").children().length, 0);
  });

  it("renders the currently selected enrollment first, then all other enrollments", () => {
    let wrapper = renderProgramSelector();
    let selectProps = wrapper.find(Select).props();

    let sortedEnrollments = _.sortBy(enrollments, 'title');
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, enrollments);

    let options = selectProps['options'];
    // include 'Enroll in a new program' which comes at the end if user can enroll in a new program
    let expectedEnrollments = sortedEnrollments.
      filter(enrollment => enrollment.id !== selectedEnrollment.id).
      map(enrollment => ({
        label: enrollment.title,
        value: enrollment.id,
      })).
      concat({
        label: "Enroll in a new program",
        value: "enroll",
      });
    assert.deepEqual(options, expectedEnrollments);
  });

  it("does not render the 'Enroll in a new program' option if there is not at least one available program", () => {
    let allEnrollments = enrollments.concat(unenrolled);
    let wrapper = renderProgramSelector({
      programs: {
        programEnrollments: allEnrollments
      }
    });
    let selectProps = wrapper.find(Select).props();
    let sortedEnrollments = _.sortBy(allEnrollments, 'title');
    // make sure we are testing sorting meaningfully
    assert.notDeepEqual(sortedEnrollments, enrollments);

    let options = selectProps['options'];
    // include 'Enroll in a new program' which comes at the end if user can enroll in a new program
    let expectedEnrollments = sortedEnrollments.
      filter(enrollment => enrollment.id !== selectedEnrollment.id).
      map(enrollment => ({
        label: enrollment.title,
        value: enrollment.id,
      }));
    assert.deepEqual(options, expectedEnrollments);
  });

  it("shows the enrollment dialog when the 'Enroll in a new program' option is clicked", () => {
    let setEnrollDialogVisibility = sandbox.stub();
    let setEnrollDialogError = sandbox.stub();
    let setEnrollSelectedProgram = sandbox.stub();
    let wrapper = renderProgramSelector({
      setEnrollDialogError,
      setEnrollDialogVisibility,
      setEnrollSelectedProgram,
    });
    let onChange = wrapper.find(Select).props()['onChange'];
    onChange({value: 'enroll'});
    assert(setEnrollDialogVisibility.calledWith(true));
    assert(setEnrollDialogError.calledWith(null));
    assert(setEnrollSelectedProgram.calledWith(null));
  });

  it("switches to a new current enrollment when a new option is clicked", () => {
    let setCurrentProgramEnrollment = sandbox.stub();

    let wrapper = renderProgramSelector({
      setCurrentProgramEnrollment,
    });
    let onChange = wrapper.find(Select).props()['onChange'];
    let newSelectedEnrollment = enrollments[0];
    onChange({value: newSelectedEnrollment.id});
    assert(setCurrentProgramEnrollment.calledWith(newSelectedEnrollment));
  });
});

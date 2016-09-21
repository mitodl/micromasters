// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import ProgressWidget from './ProgressWidget';
import {
  STATUS_NOT_PASSED,
  STATUS_PASSED
} from '../constants';

export const program = {
  "description": "Not passed program",
  "title": "Not passed program",
  "courses": [
    {
      "prerequisites": "",
      "runs": [
        {
          "certificate_url": "www.google.com",
          "title": "Gio Test Course #13",
          "status": STATUS_PASSED,
          "position": 1,
          "grade": "0.66",
          "course_id": "course-v1:odl+GIO101+FALL13",
          "id": 3,
          "course_start_date": "2016-08-22T11:48:27Z",
          "fuzzy_start_date": "Fall 2017",
          "course_end_date": "2016-09-09T10:20:10Z"
        }
      ],
      "position_in_program": 0,
      "title": "Gio Course - failed, no grade",
      "description": "",
      "id": 1
    },
    {
      "prerequisites": "",
      "runs": [
        {
          "position": 1,
          "title": "Gio Test Course #14",
          "course_id": "course-v1:odl+GIO101+FALL14",
          "status": STATUS_NOT_PASSED,
          "id": 2,
          "course_start_date": "2016-08-22T11:48:27Z",
          "fuzzy_start_date": "Fall 2017",
          "course_end_date": "2016-09-09T10:20:10Z"
        }
      ],
      "position_in_program": 1,
      "title": "8.MechCx Advanced Introductory Classical Mechanics",
      "description": "",
      "id": 2
    },
    {
      "prerequisites": "",
      "runs": [
        {
          "position": 1,
          "title": "Gio Test Course #15",
          "course_id": "course-v1:odl+GIO101+CR-FALL15",
          "status": STATUS_NOT_PASSED,
          "id": 1,
          "course_start_date": "2016-09-22T11:48:27Z",
          "fuzzy_start_date": "Fall 2016",
          "course_end_date": "2016-09-09T10:20:10Z"
        }
      ],
      "position_in_program": 2,
      "title": "EDX Demo course",
      "description": "",
      "id": 3
    }
  ],
  "id": 3
};

describe('ProgressWidget', () => {
  it('progress widget display', () => {
    const wrapper = shallow(<ProgressWidget program={program}/>);

    assert.equal(wrapper.find(".progress-title").children().text(), "Progress");
    assert.equal(wrapper.find(".text-course-complete").children().text(), "Courses complete");
    assert.equal(
      wrapper.find(".circular-progress-widget-txt").text(),
      "1/3"
    );
    assert.equal(
      wrapper.find(".heading-paragraph").text(),
      "On completion, you can apply for the Masters Degree Program"
    );
    assert.isTrue(wrapper.find(".progress-button").hasClass('disabled'), 'Button is disable');
  });
});

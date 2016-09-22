// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import CustomSortingSelect from './CustomSortingSelect';

describe('CustomSortingSelect', () => {
  const options = [
    {
      key: 'Last Name A-Z',
      label: 'Last Name A-Z',
      title: 'Last Name A-Z',
      disabled: false,
      docCount: false
    },
    {
      key: 'Last Name Z-A',
      label: 'Last Name Z-A',
      title: 'Last Name Z-A',
      disabled: false,
      docCount: false
    },
    {
      key: 'Grade Hight-to-low',
      label: 'Grade Hight-to-low',
      title: 'Grade Hight-to-low',
      disabled: false,
      docCount: false
    },
    {
      key: 'Grade Low-to-high',
      label: 'Grade Low-to-high',
      title: 'Grade Low-to-high',
      disabled: false,
      docCount: false
    },
  ];

  let props = {
    mod: "sk-select",
    className: "sk-select",
    items: options,
    disabled: false,
    showCount: false,
    translate: (text): string => { return text; },
    countFormatter: (): void => {}
  };

  it('renders dropdown', () => {
    const wrapper = shallow(<CustomSortingSelect {...props}/>);
    const optionList = wrapper.find("option");

    assert.equal(wrapper.find("span").text(), "Sort by:");
    assert.equal(optionList.at(0).text(), "Last Name A-Z");
    assert.equal(optionList.at(1).text(), "Last Name Z-A");
    assert.equal(optionList.at(2).text(), "Grade Hight-to-low");
    assert.equal(optionList.at(3).text(), "Grade Low-to-high");
  });
});

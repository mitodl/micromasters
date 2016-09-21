// @flow
import React from 'react';
import _ from 'lodash';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import CustomResetFiltersDisplay from './CustomResetFiltersDisplay';

describe('CustomResetFiltersDisplay', () => {
  let props = {
    clearAllLabel: "Clear all filters",
    hasFilters: true,
    resetFilters: () => {},
    bemBlock: (): Object => {
      return {
        state: (): void => {}
      };
    }
  };

  it('renders reset filters link', () => {
    const wrapper = shallow(<CustomResetFiltersDisplay {...props}/>);

    assert.equal(wrapper.children().children().text(), 'Clear all filters');
  });

  it('reset filter link does not render when hasFilters is false', () => {
    let noFilterProps = _.clone(props);
    noFilterProps.hasFilters = false;
    const wrapper = shallow(<CustomResetFiltersDisplay {...noFilterProps}/>);

    assert.equal(wrapper.children().length, 0);
  });
});
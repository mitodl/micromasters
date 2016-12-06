// @flow
import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { assert } from 'chai';
import { SearchkitManager, SearchkitProvider } from 'searchkit';

import CustomResetFiltersDisplay from './CustomResetFiltersDisplay';

describe('CustomResetFiltersDisplay', () => {
  let sandbox;
  let searchKit;
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

  beforeEach(() => {
    searchKit = new SearchkitManager();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('renders reset filters link', () => {
    sandbox.stub(CustomResetFiltersDisplay.prototype, 'getQuery').returns({
      'index': {
        'filters': [
          "program filter",
          "any other filter"
        ]
      }
    });
    const wrapper = mount(
      <SearchkitProvider searchkit={searchKit}>
        <CustomResetFiltersDisplay {...props}/>
      </SearchkitProvider>
    );

    assert.equal(wrapper.children().children().text(), 'Clear all filters');
  });

  it('reset filter link does not render when hasFilters is false', () => {
    sandbox.stub(CustomResetFiltersDisplay.prototype, 'getQuery').returns({
      'index': {
        'filters': [
          "program filter",
          "any other filter"
        ]
      }
    });
    let noFilterProps = _.clone(props);
    noFilterProps.hasFilters = false;
    const wrapper = mount(
      <SearchkitProvider searchkit={searchKit}>
        <CustomResetFiltersDisplay {...noFilterProps}/>
      </SearchkitProvider>
    );

    assert.lengthOf(wrapper.children(), 0);
  });

  it('do not render when there is only program filter selected', () => {
    sandbox.stub(CustomResetFiltersDisplay.prototype, 'getQuery').returns({
      'index': {
        'filters': [
          "program filter"
        ]
      }
    });
    const wrapper = mount(
      <SearchkitProvider searchkit={searchKit}>
        <CustomResetFiltersDisplay {...props}/>
      </SearchkitProvider>
    );
    assert.lengthOf(wrapper.children(), 0);
  });
});

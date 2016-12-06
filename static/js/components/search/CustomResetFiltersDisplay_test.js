// @flow
import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { assert } from 'chai';
import { SearchkitManager, SearchkitProvider } from 'searchkit';

import CustomResetFiltersDisplay from './CustomResetFiltersDisplay';

describe('CustomResetFiltersDisplay', () => {
  let sandbox;
  let searchKit;

  beforeEach(() => {
    searchKit = new SearchkitManager();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderFilters = (props = {}) => (
    mount(
      <SearchkitProvider searchkit={searchKit}>
        <CustomResetFiltersDisplay
          clearAllLabel="Clear all filters"
          hasFilters={true}
          resetFilters={() => {}}
          bemBlock={() => ({ state: () => {} })}
          {...props}
        />
      </SearchkitProvider>
    )
  );

  it('renders reset filters link', () => {
    sandbox.stub(CustomResetFiltersDisplay.prototype, 'getQuery').returns({
      'index': {
        'filters': [
          "program filter",
          "any other filter"
        ]
      }
    });
    const wrapper = renderFilters();
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
    const wrapper = renderFilters({
      hasFilters: false
    });

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
    const wrapper = renderFilters();
    assert.lengthOf(wrapper.children(), 0);
  });
});

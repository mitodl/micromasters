/* global SETTINGS: false */
import React from 'react';
import { assert } from 'chai';
import { mount } from 'enzyme';
import sinon from 'sinon';
import R from 'ramda';
import { SearchkitManager, SearchkitProvider } from 'searchkit';

import FilterVisibilityToggle, { FILTER_ID_ADJUST } from './FilterVisibilityToggle';
import { makeStrippedHtml } from '../../util/util';

describe('FilterVisibilityToggle', () => {
  let searchKit;
  let checkFilterVisibility = sinon.stub().returns(true);
  let setFilterVisibility = sinon.stub();
  let filterName = 'a filter';
  let sandbox;
  let props;

  beforeEach(() => {
    searchKit = new SearchkitManager();
    sandbox = sinon.sandbox.create();
    props = {
      checkFilterVisibility:  checkFilterVisibility,
      setFilterVisibility:    setFilterVisibility,
      filterName:             filterName,
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderToggle = R.curry(
    (renderFunc, props, children) => {
      return renderFunc(
        <SearchkitProvider searchkit={searchKit}>
          <FilterVisibilityToggle {...props}>
            { children }
          </FilterVisibilityToggle>
        </SearchkitProvider>
      );
    }
  );

  const renderStrippedHtmlToggle = renderToggle(makeStrippedHtml);
  const renderWrappedToggle = renderToggle(mount);

  it('renders children', () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns(null);
    let toggle = renderStrippedHtmlToggle(props, <div id="test">Test Text</div>);
    assert.include(toggle, "Test Text");
  });

  it('checks for filter visibility when rendering', () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns(null);
    renderStrippedHtmlToggle(props, <div id="test">Test Text</div>);
    assert(checkFilterVisibility.called);
  });

  it('hides toggle icon when no results', () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns(null);
    const wrapper = renderWrappedToggle(props, <div id="test">Test Text</div>);
    const icon = wrapper.find("i.material-icons");
    assert.lengthOf(icon, 0);
  });

  it('hides toggle icon when doc_count is 0', () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns({
      aggregations: {
        test: {
          doc_count: 0
        }
      }
    });
    const wrapper = renderWrappedToggle(props, <div id="test">Test Text</div>);
    const icon = wrapper.find("i.material-icons");
    assert.lengthOf(icon, 0);
  });

  it('hides toggle icon with a nested field that has an inner doc_count of 0', () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns({
      aggregations: {
        test: {
          doc_count: 10,
          inner: {
            doc_count: 0
          }
        }
      }
    });
    const wrapper = renderWrappedToggle(props, <div id="test">Test Text</div>);
    const icon = wrapper.find("i.material-icons");
    assert.lengthOf(icon, 0);
  });

  it('sets filter visibility when clicked', () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns({
      aggregations: {
        test: {
          doc_count: 9
        }
      }
    });
    const wrapper = renderWrappedToggle(props, <div id="test">Test Text</div>);
    const icon = wrapper.find("i.material-icons");
    assert.lengthOf(icon, 1);
    icon.simulate('click');
    assert(setFilterVisibility.called);
  });

  it("shows the toggle icon when a filter name matches our filter id map and is a prefix of an ES result key", () => {
    for (const [key, value] of Object.entries(FILTER_ID_ADJUST)) {
      sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns({
        aggregations: {
          [`${value}123`]: {
            doc_count: 2
          }
        }
      });
      props.filterName = key;
      const wrapper = renderWrappedToggle(props, <div id={key}>Test Text</div>);
      assert.equal(wrapper.find("Icon").props().className, "");
      sandbox.restore();
    }
  });

  it('shows the toggle icon the filter name is a prefix of a key in the ES results', () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns({
      aggregations: {
        [`a.b.c.d.e.f456`]: {
          doc_count: 2
        }
      }
    });
    let key = 'a.b.c.d.e.f';
    props.filterName = key;
    const wrapper = renderWrappedToggle(props, <div id={key}>Test Text</div>);
    assert.equal(wrapper.find("Icon").length, 1);
  });

  it("hides toggle icon when the filter name doesn't match anything in ES results", () => {
    sandbox.stub(FilterVisibilityToggle.prototype, 'getResults').returns({
      aggregations: {
        other_key: {
          doc_count: 2
        }
      }
    });
    let key = 'a.b.c.d.e.f';
    props.filterName = key;
    const wrapper = renderWrappedToggle(props, <div id={key}>Test Text</div>);
    assert.equal(wrapper.find("Icon").length, 0);
  });
});

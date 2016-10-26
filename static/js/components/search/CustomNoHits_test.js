// @flow
/* global SETTINGS: false */
import React from 'react';
import { assert } from 'chai';
import sinon from 'sinon';

import CustomNoHits from './CustomNoHits';
import { makeStrippedHtml } from '../../util/util';


describe('CustomNoHits', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  let renderCustomNoHits = () => (
    makeStrippedHtml(<CustomNoHits />)
  );

  const stubCommon: Function = (): void => {
    sandbox.stub(CustomNoHits.prototype, 'componentWillMount');
    sandbox.stub(CustomNoHits.prototype, 'getSuggestion').returns("NoHits.NoResultsFound");
    sandbox.stub(CustomNoHits.prototype, 'getQuery').returns({ 'getQueryString': () => ("test") });
    sandbox.stub(CustomNoHits.prototype, 'translate').returns("Error!!");
    sandbox.stub(CustomNoHits.prototype, 'isInitialLoading').returns(false);
    sandbox.stub(CustomNoHits.prototype, 'isLoading').returns(false);
  };

  it('display when no search results', () => {
    stubCommon();
    sandbox.stub(CustomNoHits.prototype, 'hasHits').returns(false);
    sandbox.stub(CustomNoHits.prototype, 'getError').returns(false);

    let results = renderCustomNoHits();
    assert.include(results, "There are no results for your search.");
  });

  it('hid when have search results', () => {
    stubCommon();
    sandbox.stub(CustomNoHits.prototype, 'hasHits').returns(true);
    sandbox.stub(CustomNoHits.prototype, 'getError').returns(false);

    let results = renderCustomNoHits();
    assert.notInclude(results, "There are no results for your search.");
  });

  it('when error in search results', () => {
    stubCommon();
    sandbox.stub(CustomNoHits.prototype, 'hasHits').returns(false);
    sandbox.stub(CustomNoHits.prototype, 'getError').returns(true);

    let results = renderCustomNoHits();
    assert.include(results, "Error!!");
  });
});

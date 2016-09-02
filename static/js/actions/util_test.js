// @flow
import { assert } from 'chai';

import { actionCreatorGenerator } from './util';

describe('action util functions', () => {
  const FAKE_ACTION_TYPE = 'FAKE_ACTION_TYPE';

  describe('actionCreatorGenerator', () => {
    it('should return a function', () => {
      assert.isFunction(actionCreatorGenerator(FAKE_ACTION_TYPE));
    });

    it('returned function should return a simple action when no args are passed', () => {
      let creator = actionCreatorGenerator(FAKE_ACTION_TYPE);
      assert.deepEqual({ type: FAKE_ACTION_TYPE }, creator());
    });

    it('returned function should return an action w/ payload when args are passed', () => {
      let creator = actionCreatorGenerator(FAKE_ACTION_TYPE);
      let expected = { type: FAKE_ACTION_TYPE, payload: "HI" };
      assert.deepEqual(expected, creator('HI'));
    });
  });
});

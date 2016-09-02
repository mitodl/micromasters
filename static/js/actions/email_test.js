// @flow
import { assert } from 'chai';

import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,

  START_EMAIL_EDIT,
  UPDATE_EMAIL_EDIT,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
} from './email';

describe('email actions', () => {
  describe('email action helpers', () => {
    const assertCreatedActionHelper = ([actionHelper, actionType]) => {
      it(`should create the ${actionType} simple action helper correctly`, () => {
        assert.deepEqual(actionHelper(), {type: actionType});
      });

      it(`should create the ${actionType} action helper with args correctly`, () => {
        assert.deepEqual(actionHelper({foo: "bar"}), { type: actionType, payload: { foo: "bar" } });
      });
    };

    [
      [startEmailEdit, START_EMAIL_EDIT],
      [updateEmailEdit, UPDATE_EMAIL_EDIT],
      [clearEmailEdit, CLEAR_EMAIL_EDIT],
      [updateEmailValidation, UPDATE_EMAIL_VALIDATION],
    ].forEach(assertCreatedActionHelper);
  });
});

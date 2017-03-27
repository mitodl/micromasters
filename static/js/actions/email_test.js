// @flow
import {
  startEmailEdit,
  updateEmailEdit,
  clearEmailEdit,
  updateEmailValidation,
  setAutomaticEmailType,

  START_EMAIL_EDIT,
  UPDATE_EMAIL_EDIT,
  CLEAR_EMAIL_EDIT,
  UPDATE_EMAIL_VALIDATION,
  AUTOMATIC_EMAIL_TYPE,
} from './email';
import { assertCreatedActionHelper } from './test_util';

describe('generated email action helpers', () => {
  it('should create all action creators', () => {
    [
      [startEmailEdit, START_EMAIL_EDIT],
      [updateEmailEdit, UPDATE_EMAIL_EDIT],
      [setAutomaticEmailType, AUTOMATIC_EMAIL_TYPE],
      [clearEmailEdit, CLEAR_EMAIL_EDIT],
      [updateEmailValidation, UPDATE_EMAIL_VALIDATION],
    ].forEach(assertCreatedActionHelper);
  });
});

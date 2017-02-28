import React from 'react';
import { INITIAL_EMAIL_STATE } from '../../reducers/email';

const dummyEmailActionDispatcher = () => (
  () => (
    new Promise(() => {}).then(() => {})
  )
);

export const TEST_EMAIL_TYPE = 'TEST_EMAIL';
export const TEST_EMAIL_CONFIG = {
  title: 'Test Email Dialog',
  renderSubheading: (subheading: ?string) => (
    <div className="test-subheading">{ subheading }</div>
  ),
  emailOpenParams: () => {},
  emailSendAction: dummyEmailActionDispatcher
};
export const INITIAL_TEST_EMAIL_STATE = {
  [TEST_EMAIL_TYPE]: { ...INITIAL_EMAIL_STATE },
  currentlyActive: TEST_EMAIL_TYPE
};

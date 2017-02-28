// @flow
import type { Dispatcher } from './reduxTypes';

export type EmailSendResponse = {
  errorStatusCode?: number,
};
export type EmailSendError = EmailSendResponse;

export type EmailInputs = {
  subject?:   ?string,
  body?:      ?string,
};
export type EmailValidationErrors = EmailInputs;

export type EmailState = {
  inputs:           EmailInputs,
  subheading:       ?string,
  params:           Object,
  validationErrors: EmailValidationErrors,
  sendError:        EmailSendError,
  fetchStatus?:     ?string,
};

export type AllEmailsState = {
  currentlyActive:     ?string,
  searchResultEmail?:  EmailState,
  courseTeamEmail?:    EmailState,
};

export type EmailConfig = {
  title: string,
  renderSubheading: (subheading: ?string) => React$Element<*>,
  emailOpenParams: (args: any) => Object,
  emailSendAction: (emailState: EmailState) => Dispatcher<EmailSendResponse>
};

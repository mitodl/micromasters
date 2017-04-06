// @flow
export type EmailSendResponse = {
  errorStatusCode?: number,
};
export type EmailSendError = EmailSendResponse;

export type EmailInputs = {
  subject?:             ?string,
  body?:                ?string,
  sendAutomaticEmails?: boolean,
};

export type Filter = {
  id:    string,
  name?: string,
  value: string
}

export type EmailValidationErrors = EmailInputs;

export type EmailState = {
  inputs:                   EmailInputs,
  subheading:               ?string,
  params:                   Object,
  validationErrors:         EmailValidationErrors,
  sendError:                EmailSendError,
  fetchStatus?:             ?string,
  supportsAutomaticEmails?: boolean,
  filters:                  ?Array<Filter>,
};

export type AllEmailsState = {
  currentlyActive:     ?string,
  searchResultEmail?:  EmailState,
  courseTeamEmail?:    EmailState,
};

export type EmailConfig = {
  title: string,
  renderSubheading: (activeEmail: EmailState) => React$Element<*>,
  emailOpenParams: (args: any) => Object,
  getEmailSendFunction: () => Function,
  emailSendParams: (emailState: EmailState) => Array<any>,
  renderRecipients?: (filters: ?Array<Filter>) => React$Element<*>,
};

// @flow

export type Option = {
  value:     any;
  label:     string;
  disabled?: boolean;
};
export type Settings = {
  gaTrackingID: string;
  reactGaDebug: boolean;
  authenticated: boolean;
  name: string;
  username: string;
  host: string;
  edx_base_url: string;
};

export type APIErrorInfo = {
  error_code?: string,
  user_message?: string,
  detail?: string,
  errorStatusCode?: number,
};

export type ToastMessage = {
  message: string,
  icon?: string,
};

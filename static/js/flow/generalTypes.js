// @flow
export type Option = {
  value: string;
  label: string;
};

export type Action = {
  type: string;
  payload: any
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


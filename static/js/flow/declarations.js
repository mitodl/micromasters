// @flow
/* eslint-disable no-unused-vars */
declare var SETTINGS: {
  gaTrackingID: string,
  reactGaDebug: boolean,
  authenticated: boolean,
  name: string,
  username: string,
  user: {
    username: string,
  },
  host: string,
  edx_base_url: string,
  EXAMS_SSO_CLIENT_CODE: string,
  EXAMS_SSO_URL: string,
  FEATURES: {
    [key: string]: boolean,
  },
  support_email: string,
  es_page_size: number,
  search_url: string,
  roles: Array<{ role: string }>,
  open_discussions_redirect_url: string,
  partner_schools: Array<[number, string]>,
  hash: string,
};

// mocha
declare var it: Function;
declare var beforeEach: Function;
declare var afterEach: Function;
declare var describe: Function;

// webpack
declare var __webpack_public_path__: string; // eslint-disable-line camelcase

declare class FormData {
  get(s: string): any,
  append(x: any, y: any): void,
}

declare var module: {
  hot: any,
}

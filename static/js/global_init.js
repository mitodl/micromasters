// Define globals we would usually get from Django
import ReactDOM from 'react-dom';

const _createSettings = () => ({
  user: {
    username: "jane",
    email: "jane@example.com",
    first_name: "Jane",
    last_name: "Doe",
    preferred_name: "JD"
  },
  edx_base_url: "/edx/",
  search_url: '/',
  roles: [],
  support_email: "a_real_email@example.com",
  es_page_size: 40,
  EXAMS_SSO_CLIENT_CODE: 'foobarcode',
  EXAMS_SSO_URL: 'http://foo.bar/baz',
  FEATURES: {
    PROGRAM_LEARNERS: true,
  },
  get username() {
    throw new Error("username was removed");
  }
});

global.SETTINGS = _createSettings();

// polyfill for Object.entries
import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

let localStorageMock = require('./util/test_utils').localStorageMock;
beforeEach(() => { // eslint-disable-line mocha/no-top-level-hooks
  window.localStorage = localStorageMock();
  window.sessionStorage = localStorageMock();
});

// cleanup after each test run
afterEach(function () { // eslint-disable-line mocha/no-top-level-hooks
  let node = document.querySelector("#integration_test_div");
  if (node) {
    ReactDOM.unmountComponentAtNode(node);
  }
  document.body.innerHTML = '';
  global.SETTINGS = _createSettings();
  window.localStorage.reset();
  window.sessionStorage.reset();
  window.location = 'http://fake/';
});

// required for interacting with react-mdl components
require('react-mdl/extra/material.js');

// rethrow all unhandled promise errors
process.on('unhandledRejection', reason => { // eslint-disable-line no-unused-vars
  // throw reason; // uncomment to show promise-related errors
});

// fix 'unknown prop' error
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

// enable chai-as-promised
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

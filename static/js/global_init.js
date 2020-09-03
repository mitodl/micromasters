// Define globals we would usually get from Django
import React from "react"
import ReactDOM from "react-dom"
import { configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import * as ReactTransitionGroup from "react-transition-group"

configure({ adapter: new Adapter() })

const _createSettings = () => ({
  user: {
    username:       "jane",
    email:          "jane@example.com",
    first_name:     "Jane",
    last_name:      "Doe",
    preferred_name: "JD"
  },
  edx_base_url:          "/edx/",
  search_url:            "/",
  roles:                 [],
  support_email:         "a_real_email@example.com",
  es_page_size:          40,
  EXAMS_SSO_CLIENT_CODE: "foobarcode",
  EXAMS_SSO_URL:         "http://foo.bar/baz",
  FEATURES:              {
    PROGRAM_LEARNERS:              true,
    DISCUSSIONS_POST_UI:           true,
    DISCUSSIONS_CREATE_CHANNEL_UI: true,
    PROGRAM_RECORD_LINK:           true,
    ENABLE_PROGRAM_LETTER:         true,
    ENABLE_EDX_EXAMS:              true
  },
  open_discussions_redirect_url: "http://open.discussions",
  get username() {
    throw new Error("username was removed")
  }
})

global.SETTINGS = _createSettings()

// polyfill for Object.entries
import entries from "object.entries"
if (!Object.entries) {
  entries.shim()
}

import fetchMock from "fetch-mock"
// Mock react-transition-group which is used by material-ui. It causes test failures due to a callback timed to
// occur after the test has already cleaned up the DOM elements.
const FakeTransition = ({ children }) => children()
const FakeCSSTransition = props =>
  props.in ? <FakeTransition>{props.children}</FakeTransition> : null
// adapted from https://testing-library.com/docs/example-react-transition-group
ReactTransitionGroup.Transition = FakeTransition
ReactTransitionGroup.CSSTransition = FakeCSSTransition

// eslint-disable-next-line mocha/no-top-level-hooks
beforeEach(() => {
  // Uncomment to diagnose stray API calls. Also see relevant block in afterEach
  /*
  fetchMock.restore();
  fetchMock.catch((...args) => {
    console.log("ERROR: Unmatched request: ", args);
    console.trace();
    process.exit(1);
  });
  */
})

// cleanup after each test run
// eslint-disable-next-line mocha/no-top-level-hooks
afterEach(function() {
  const node = document.querySelector("#integration_test_div")
  if (node) {
    ReactDOM.unmountComponentAtNode(node)
  }
  document.body.innerHTML = ""
  global.SETTINGS = _createSettings()
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.location = "http://fake/"

  // Comment next line to diagnose stray API calls. Also see relevant block in beforeEach
  fetchMock.restore()
  // Uncomment this to diagnose stray API calls
  // This adds a 200 ms delay between tests. Since fetchMock is still enabled at this point the next unmatched
  // fetch attempt which occurs within 200 ms after the test finishes will cause a warning.
  // return require('./util/util').wait(200);
})

// rethrow all unhandled promise errors
// eslint-disable-next-line no-unused-vars
process.on("unhandledRejection", reason => {
  // throw reason; // uncomment to show promise-related errors
})

// enable chai-as-promised
import chai from "chai"
import chaiAsPromised from "chai-as-promised"
chai.use(chaiAsPromised)

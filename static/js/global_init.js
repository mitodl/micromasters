// Define globals we would usually get from Django
const settings = {
  authenticated: true,
  name: "full name",
  username: "jane",
  edx_base_url: "/edx/",
  roles: []
};
global.SETTINGS = Object.assign({}, settings);

// polyfill for Object.entries
import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

// Make sure window and document are available for testing
require('jsdom-global')();

// cleanup after each test run
afterEach(function (){
  document.body.innerHTML = '';
  global.SETTINGS = Object.assign({}, settings);
});

// required for interacting with react-mdl components
require('react-mdl/extra/material.js');

// rethrow all unhandled promise errors
process.on('unhandledRejection', reason => { // eslint-disable-line no-unused-vars
  // throw reason; // uncomment to show promise-related errors
});

// enable chai-as-promised
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

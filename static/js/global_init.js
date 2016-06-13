// Define globals we would usually get from Django
global.SETTINGS = {
  isAuthenticated: true,
  name: "full name",
  username: "jane",
  edx_base_url: "/edx/"
};

// polyfill for Object.entries
import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

// Make sure window and document are available for testing
require('jsdom-global')();

// required for interacting with react-mdl components
require('react-mdl/extra/material.js');

// rethrow all unhandled promise errors
process.on('unhandledRejection', reason => {
  throw reason;
});

// enable chai-as-promised
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

// Define globals we would usually get from Django
global.SETTINGS = {
  isAuthenticated: true,
  name: "full name",
  username: "jane",
  edx_base_url: "/edx/"
};

// Make sure window and document are available for testing
require('jsdom-global')();

// required for interacting with react-mdl components
require('react-mdl/extra/material.js');

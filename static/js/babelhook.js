const { babelSharedLoader } = require("../../webpack.config.shared");
require('babel-polyfill');

require('babel-register')(babelSharedLoader.query);

// Force everything to the latest version of react
let React = require('react');
let mockRequire = require('mock-require');
mockRequire('react', React);

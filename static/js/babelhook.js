const { babelSharedLoader } = require("../../webpack.config.shared");
require('babel-polyfill');

require('babel-register')(babelSharedLoader.query);

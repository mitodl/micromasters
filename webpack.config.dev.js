var webpack = require('webpack');
var path = require("path");
var sharedConfig = require(path.resolve("./webpack.config.shared.js"));
var R = require('ramda');
var BundleTracker = require('webpack-bundle-tracker');

const hotEntry = (host, port) => (
  `webpack-hot-middleware/client?path=http://${host}:${port}/__webpack_hmr&timeout=20000&reload=true`
);

const insertHotReload = (host, port, entries) => (
  R.map(R.compose(R.flatten, v => [v].concat(hotEntry(host, port))), entries)
);

const devConfig = {
  context: __dirname,
  output: {
    path: path.resolve('./static/bundles/'),
    filename: "[name].js"
  },
  module: sharedConfig.module,
  sassLoader: sharedConfig.sassLoader,
  resolve: sharedConfig.resolve,
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': '"development"'
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 2,
    }),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new BundleTracker({filename: './webpack-stats.json'})
  ],
  devtool: 'source-map'
};

const makeDevConfig = (host, port) => (
  Object.assign({}, devConfig, { 
    entry: insertHotReload(host, port, sharedConfig.entry),
  })
);

module.exports = makeDevConfig;

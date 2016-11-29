var webpack = require('webpack');
var path = require("path");
var sharedConfig = require(path.resolve("./webpack.config.shared.js"));
var BundleTracker = require('webpack-bundle-tracker');

module.exports = {
  context: __dirname,
  entry: sharedConfig.entry,
  output: {
    path: path.resolve('./static/bundles/'),
    filename: "[name]-[chunkhash].js"
  },
  module: sharedConfig.module,
  sassLoader: sharedConfig.sassLoader,
  resolve: sharedConfig.resolve,

  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': '"production"'
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 2,
    }),
    new BundleTracker({
      filename: './webpack-stats.json'
    })
  ],
  devtool: 'source-map'
};

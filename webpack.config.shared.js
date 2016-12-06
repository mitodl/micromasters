var path = require("path");
var webpack = require("webpack");

let babelQuerySettings = {
  babelrc: './.babelrc'
}

module.exports = {
  entry: {
    'dashboard': ['babel-polyfill', './static/js/entry/dashboard'],
    'financial_aid': './static/js/financial_aid/functions',
    'public': ['babel-polyfill', './static/js/entry/public'],
    'sentry_client': './static/js/entry/sentry_client.js',
    'style': './static/js/entry/style',
    'style_public': './static/js/entry/style_public',
    'zendesk_widget': './static/js/entry/zendesk_widget.js',
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader?' + JSON.stringify(babelQuerySettings)
      },  // to transform JSX into JS
      {
        test: /\.(svg|ttf|woff|woff2|eot|gif)$/,
        loader: 'url-loader'
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        loader: 'style!css!postcss!sass'
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        loader: 'style!css'
      },
    ]
  },

  resolve: {
    modulesDirectories: ['node_modules'],
    extensions: ['', '.js', '.jsx'],
    alias: {
      react: path.resolve('./node_modules/react')
    }
  }
};

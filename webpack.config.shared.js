var path = require("path");
var webpack = require("webpack");

let babelQuerySettings = {
  presets: ['es2015', 'stage-1', 'react']
}

module.exports = {
  entry: {
    'dashboard': ['babel-polyfill', './static/js/dashboard'],
    'signup_dialog': './static/js/signup_dialog',
    'faculty_carousel': './static/js/faculty_carousel',
    'financial_aid': './static/js/financial_aid/functions',
    'public': ['babel-polyfill', './static/js/public'],
    'style': './static/js/style',
    'style_public': './static/js/style_public',
  },
  output: {
    path: path.resolve('./static/bundles/'),
    filename: "[name].js"
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loaders: ['react-hot', 'babel-loader?' + JSON.stringify(babelQuerySettings)],
      },  // to transform JSX into JS
      {
        test: /\.(svg|ttf|woff|woff2|eot|gif)$/,
        loader: 'url-loader'
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        loader: 'style!css!sass'
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

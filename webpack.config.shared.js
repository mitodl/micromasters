const path = require("path");
const webpack = require("webpack");

module.exports = {
  config: {
    entry: {
      'dashboard': './static/js/entry/dashboard',
      'financial_aid': './static/js/financial_aid/functions',
      'public': './static/js/entry/public',
      'public_jquery': './static/js/entry/public_jquery',
      'sentry_client': './static/js/entry/sentry_client.js',
      'style': './static/js/entry/style',
      'style_public': './static/js/entry/style_public',
      'style_certificate': './static/js/entry/style_certificate',
      'zendesk_widget': './static/js/entry/zendesk_widget.js',
    },
    module: {
      rules: [
        {
          test: /\.(svg|ttf|woff|woff2|eot|gif)$/,
          use: 'url-loader'
        },
      ]
    },
    resolve: {
      modules: [
        path.join(__dirname, "static/js"),
        "node_modules"
      ],
      extensions: ['.js', '.jsx'],
    },
    performance: {
      hints: false
    }
  },
  babelSharedLoader: {
    test: /\.jsx?$/,
    include: [
      path.resolve(__dirname, "static/js"),
      path.resolve(__dirname, "node_modules/@material-ui"),
    ],
    loader: 'babel-loader',
    query: {
      "presets": [
        "@babel/preset-env",
        "@babel/preset-react"
      ],
      "plugins": [
        "transform-flow-strip-types",
        "react-hot-loader/babel",
        "transform-class-properties",
        "syntax-dynamic-import",
      ]
    }
  },
};

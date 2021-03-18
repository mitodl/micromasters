const path = require("path");
const webpack = require("webpack");

module.exports = {
  config: {
    entry: {
      'dashboard': ['@babel/polyfill', './static/js/entry/dashboard'],
      'financial_aid': './static/js/financial_aid/functions',
      'public': ['@babel/polyfill', './static/js/entry/public'],
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
    test:    /\.jsx?$/,
    include: [
      path.resolve(__dirname, "static/js"),
      path.resolve(__dirname, "node_modules/@material-ui"),
    ],
    loader: 'babel-loader',
    query:  {
      presets: [
        ["@babel/preset-env", { modules: false }],
        "@babel/preset-react",
        "@babel/preset-flow"
      ],
      plugins: [
        "@babel/plugin-transform-flow-strip-types",
        "react-hot-loader/babel",
        "@babel/plugin-proposal-object-rest-spread",
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-syntax-dynamic-import",
      ]
    }
  },
}

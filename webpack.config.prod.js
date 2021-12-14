/* global SETTINGS: false */
const webpack = require('webpack')
var path = require("path");
const fs = require('fs');
var BundleTracker = require('webpack-bundle-tracker');
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const SentryWebpackPlugin = require("@sentry/webpack-plugin");
const { config, babelSharedLoader } = require(path.resolve("./webpack.config.shared.js"));

const prodBabelConfig = Object.assign({}, babelSharedLoader);

prodBabelConfig.query.plugins.push(
  "transform-react-constant-elements",
  "transform-react-inline-elements"
);

const filePath = path.join(__dirname, "VERSION");
const SENTRY_RELEASE = fs.readFileSync(
  filePath, "utf8").split("\r?\n/")[0].trim();

const prodConfig = Object.assign({}, config);
prodConfig.module.rules = [
  prodBabelConfig,
  ...config.module.rules,
  {
    test: /\.css$|\.scss$/,
    use:  [
      {
        loader: MiniCssExtractPlugin.loader
      },
      "css-loader",
      "postcss-loader",
      "sass-loader"
    ]
  }
];

module.exports = Object.assign(prodConfig, {
  context: __dirname,
  mode: 'production',
  output: {
    path: path.resolve('./static/bundles/'),
    filename: "[name]-[chunkhash].js",
    chunkFilename: "[id]-[chunkhash].js",
    crossOriginLoading: "anonymous",
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: '"production"'
      }
    }),
    new BundleTracker({
      filename: './webpack-stats.json'
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    new webpack.optimize.AggressiveMergingPlugin(),
    new MiniCssExtractPlugin({
      filename: "styles-[name]-[contenthash].css"
    }),
    ...process.env.MICROMASTERS_ENVIRONMENT ? [new SentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org : process.env.SENTRY_ORG_NAME,
      project : process.env.SENTRY_PROJECT_NAME,
      release : SENTRY_RELEASE,
      include : '.',
      ignoreFile: ".gitignore"
    })] : []
  ],
  optimization: {
    minimize: true
  },
  devtool: 'source-map'
});

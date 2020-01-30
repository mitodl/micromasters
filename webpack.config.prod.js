var webpack = require('webpack');
var path = require("path");
var BundleTracker = require('webpack-bundle-tracker');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const { config, babelSharedLoader } = require(path.resolve("./webpack.config.shared.js"));

const prodBabelConfig = Object.assign({}, babelSharedLoader);

prodBabelConfig.query.plugins.push(
  "transform-react-constant-elements",
  "transform-react-inline-elements"
);

const prodConfig = Object.assign({}, config);
prodConfig.module.rules = [
  prodBabelConfig,
  ...config.module.rules,
  {
    test: /\.css$|\.scss$/,
    use:     ExtractTextPlugin.extract({
      fallback: 'style-loader',
      use:      ['css-loader', 'postcss-loader', 'sass-loader'],
    })
  }
];

module.exports = Object.assign(prodConfig, {
  context: __dirname,
  output: {
    path: path.resolve('./static/bundles/'),
    filename: "[name]-[chunkhash].js",
    chunkFilename: "[id]-[chunkhash].js",
    crossOriginLoading: "anonymous",
  },
  mode: 'production',
  plugins: [
    new BundleTracker({
      filename: './webpack-stats.json'
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    new webpack.optimize.AggressiveMergingPlugin(),
    new ExtractTextPlugin({
      filename: "styles-[name]-[contenthash].css",
      allChunks: true,
      ignoreOrder: false,
    }),
  ],
  optimization: {
    splitChunks: {
      name:      "common",
      minChunks: 2
    },
    minimize: true
  },
  devtool: 'source-map'
});

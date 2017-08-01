var path = require('path');
var webpack = require('webpack');
var express = require('express');
var devMiddleware = require('webpack-dev-middleware');
var hotMiddleware = require('webpack-hot-middleware');
var minimist = require('minimist');

var makeDevConfig = require('./webpack.config.dev');

const { host, port } = minimist(process.argv.slice(2));

const config = makeDevConfig(host, port);

const app = express();

const compiler = webpack(config);

app.use(function(req, res, next) {
 res.header('Access-Control-Allow-Origin', '*');
 next();
});

app.use(devMiddleware(compiler, {
  publicPath: "/"
}));

app.use(hotMiddleware(compiler));

app.listen(8078, (err) => {
  if (err) {
    return console.error(err)
  }
  console.log(`listening at http://${host}:${port}`);
  console.log('building...');
});

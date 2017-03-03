const autoprefixer = require('autoprefixer');
const assets = require('postcss-assets');

const CF_DIST = process.env.CLOUDFRONT_DIST;
let baseUrl = '/';
if (CF_DIST) {
  baseUrl = `https://${CF_DIST}.cloudfront.net/`;
}

module.exports = {
  plugins: [
    autoprefixer({
      browsers: ['> 1%']
    }),
    assets({
      baseUrl: baseUrl,
      loadPaths: ['static']
    })
  ]
}

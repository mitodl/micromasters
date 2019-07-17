const { babelSharedLoader } = require("../../webpack.config.shared")
require("babel-polyfill")

// jsdom initialization here adapted from from https://airbnb.io/enzyme/docs/guides/jsdom.html
const { JSDOM } = require("jsdom")
const jsdom = new JSDOM("<!doctype html><html><body></body></html>")
const { window } = jsdom

// We need to explicitly change the URL when window.location is used
function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target)
  })
}

global.window = window
global.document = window.document
global.navigator = {
  userAgent: "node.js"
}
global.requestAnimationFrame = function(callback) {
  return setTimeout(callback, 0)
}
global.cancelAnimationFrame = function(id) {
  clearTimeout(id)
}
copyProps(window, global)

Object.defineProperty(window, "location", {
  set: (value) => {
    if (!value.startsWith("http")) {
      value = `http://fake${value}`
    }
    jsdom.reconfigure({ url: value })
  }
})

require("babel-register")(babelSharedLoader.query)

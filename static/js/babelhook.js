const { babelSharedLoader } = require("../../webpack.config.shared")

// window and global must be defined here before React is imported
require("@mitodl/jsdom-global")(undefined, {
  url: "http://fake/",
  pretendToBeVisual: true
})

// We need to explicitly change the URL when window.location is used
Object.defineProperty(window, "location", {
  set: value => {
    if (!value.startsWith("http")) {
      value = `http://fake${value}`
    }
    global._jsdom.reconfigure({ url:  value })
  }
})

global.requestAnimationFrame = function(callback) {
  setTimeout(callback, 0);
};

global.cancelAnimationFrame = function(callback) {
  setTimeout(callback, 0);
};

require("@babel/register")(babelSharedLoader.query)
require("core-js/stable")
require("regenerator-runtime/runtime")

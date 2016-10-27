/* global SETTINGS:false zE:false */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase

// Start of odl Zendesk Widget script
/*<![CDATA[*/
window.zEmbed || function (e, t) {
  let n, o, d, i, s, a = [],
    r = document.createElement("iframe");
  window.zEmbed = function () {
    a.push(arguments);
  },
    window.zE = window.zE || window.zEmbed, r.src = "javascript:false", r.title = "",
    r.role = "presentation", (r.frameElement || r).style.cssText = "display: none",
    d = document.getElementsByTagName("script"), d = d[d.length - 1],
    d.parentNode.insertBefore(r, d), i = r.contentWindow, s = i.document;
  try {
    o = s;
  } catch (e) {
    n = document.domain,
    r.src = `javascript:var d=document.open();d.domain="${n}";void(0);`,
    o = s;
  }
  o.open()._l = function () {
    const o = this.createElement("script");
    n && (this.domain = n), o.id = "js-iframe-async", o.src = e, this.t = +new Date, this.zendeskHost = t,
      this.zEQueue = a, this.body.appendChild(o);
  }, o.write('<body onload="document._l();">'),
    o.close();
}("https://assets.zendesk.com/embeddable_framework/main.js", "odl.zendesk.com");
 /*]]>*/


// This will execute when Zendesk's Javascript is finished executing, and the
// Web Widget API is available to be used. The HTML for the Zendesk widget
// may *not* have been inserted into the DOM yet.
zE(function() {
  // trigger onZendeskIFrameExists at the appropriate time
  let tries = 0;
  const intervalID = setInterval(() => {
    tries += 1;
    const iframe = document.querySelector("iframe.zEWidget-launcher");
    if (iframe) {
      clearInterval(intervalID);
      onZendeskIFrameExists();
    } else if (tries > 100) { // max 100 tries (10 seconds)
      console.error("couldn't find Zendesk iframe");  // eslint-disable-line no-console
      clearInterval(intervalID);
    }
  }, 100); // check every 100 milliseconds
});

// This will execute when Zendesk's <iframe> element has been inserted into
// the DOM. The <iframe> may *not* have finished loading its content yet.
let onZendeskIFrameExists = () => {
  // trigger onZendeskIFrameLoaded at the appropriate time
  let tries = 0;
  const intervalID = setInterval(() => {
    tries += 1;
    const iframe = document.querySelector("iframe.zEWidget-launcher");
    const btn = iframe.contentDocument.querySelector(".Button--launcher");
    if (btn) {
      clearInterval(intervalID);
      onZendeskIFrameLoaded();
    } else if (tries > 100) { // max 100 tries (10 seconds)
      console.error("couldn't load Zendesk iframe");  // eslint-disable-line no-console
      clearInterval(intervalID);
    }
  }, 100); // check every 100 milliseconds
};

// This will execute when Zendesk's <iframe> element has finished loading
// its content. It would be nice if we could just use iframe.onload,
// but because the page is loaded from a different domain, the browser
// won't allow us to detect that event.
let onZendeskIFrameLoaded = () => {
  const iframe = document.querySelector("iframe.zEWidget-launcher");
  const btn = iframe.contentDocument.querySelector(".Button--launcher");

  const regularBackgroundColor = "rgba(0, 0, 0, .14)";
  const hoverBackgroundColor = window.getComputedStyle(btn).backgroundColor;
  // We need to set a new background color, and unfortunately,
  // the existing background color is set with "!important".
  // As a result, the only way to overriding this existing color is to
  // *also* use "!important".
  const setHover = () => {
    btn.style.setProperty(
      "background-color", hoverBackgroundColor, "important"
    );
  };
  const unsetHover = () => {
    btn.style.setProperty(
      "background-color", regularBackgroundColor, "important"
    );
  };
  btn.onmouseenter = setHover;
  btn.onmouseleave = unsetHover;
  unsetHover();
};

/* global SETTINGS:false zE:false _:false */
__webpack_public_path__ = `${SETTINGS.public_path}` // eslint-disable-line no-undef, camelcase

// Start of odl Zendesk Widget script
/* eslint-disable no-sequences, prefer-const */
/*<![CDATA[*/
window.zEmbed ||
  (function(e, t) {
    let n,
      o,
      d,
      i,
      s,
      a = [],
      r = document.createElement("iframe")
    ;(window.zEmbed = function() {
      a.push(arguments)
    }),
    (window.zE = window.zE || window.zEmbed),
    (r.src = "javascript:false"),
    (r.title = ""),
    (r.role = "presentation"),
    ((r.frameElement || r).style.cssText = "display: none"),
    (d = document.getElementsByTagName("script")),
    (d = d[d.length - 1]),
    d.parentNode.insertBefore(r, d),
    (i = r.contentWindow),
    (s = i.document)
    try {
      o = s
    } catch (e) {
      (n = document.domain),
      (r.src = `javascript:var d=document.open();d.domain="${n}";void(0);`),
      (o = s)
    }
    (o.open()._l = function() {
      const o = this.createElement("script")
      n && (this.domain = n),
      (o.id = "js-iframe-async"),
      (o.src = e),
      (this.t = +new Date()),
      (this.zendeskHost = t),
      (this.zEQueue = a),
      this.body.appendChild(o)
    }),
    o.write('<body onload="document._l();">'),
    o.close()
  })(
    "https://static.zdassets.com/ekr/snippet.js?key=0c7cfbbc-76c9-4083-869f-b76d03922056",
    "mitx-micromasters.zendesk.com"
  )
/*]]>*/
/* eslint-enable no-sequences */

// This will execute when Zendesk's Javascript is finished executing, and the
// Web Widget API is available to be used. Zendesk's various iframes may *not*
// have been inserted into the DOM yet.
document.addEventListener("DOMContentLoaded", function() {
  zE(function() {
    // pre-populate feedback form
    if (SETTINGS.user) {
      const user = SETTINGS.user
      const identity = {}
      if (user.first_name && user.last_name) {
        identity.name = `${user.first_name} ${user.last_name}`
      }
      if (user.email) {
        identity.email = user.email
      }
      zE.identify(identity)
    }
  })
})

/* global SETTINGS:false zE:false _:false */
__webpack_public_path__ = `${SETTINGS.public_path}` // eslint-disable-line no-undef, camelcase
import R from "ramda"

import { wait } from "../util/util"

// Start of odl Zendesk Widget script
/* eslint-disable no-sequences */
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
    "https://assets.zendesk.com/embeddable_framework/main.js",
    "odl.zendesk.com"
  )
/*]]>*/
/* eslint-enable no-sequences */

// This will execute when Zendesk's Javascript is finished executing, and the
// Web Widget API is available to be used. Zendesk's various iframes may *not*
// have been inserted into the DOM yet.
zE(function() {
  // pre-populate feedback form
  if (SETTINGS.user) {
    const user = SETTINGS.user
    let identity = {}
    if (user.first_name && user.last_name) {
      identity.name = `${user.first_name} ${user.last_name}`
    }
    if (user.email) {
      identity.email = user.email
    }
    zE.identify(identity)
  }

  setupZendeskCallbacks()
})

const zendeskCallbacks = {
  // This object supports the following functions:
  //   launcherExists: runs when the launcher iframe exists on the page
  //   launcherLoaded: runs when the launcher iframe's content is loaded
  //   ticketSubmissionFormExists: runs when the submission form iframe exists
  //   ticketSubmissionFormLoaded: runs when the submission form is loaded
  //   npsExists: runs when the NPS iframe exists on the page
  //   npsLoaded: runs when the NPS iframe is loaded
  //   ipmExists: runs when the IPM iframe exists on the page
  //   ipmLoaded: runs when the IPM iframe is loaded
  // NPS = Net Promoter Score
  // IPM = In-Product Message (Zendesk Connect)
  //
  // The `setupZendeskCallbacks()` function will ensure that these functions
  // are called at the appropriate time. For any given iframe, the "exists"
  // function will always be called before the "loaded" function.
  // We expect that the "exists" functions  will all be executed roughly
  // simultaneously, and the "loaded" function will all be executed roughly
  // simultaneously after that. However, due to the unpredictable nature of
  // the internet and callbacks in general, one iframe may be finished loading
  // before another iframe even exists.

  launcherLoaded: () => {
    const iframe = document.querySelector("iframe.zEWidget-launcher")
    const btn = iframe.contentDocument.querySelector(".u-userBackgroundColor")

    const regularBackgroundColor = "rgba(0, 0, 0, .14)"
    const hoverBackgroundColor = window.getComputedStyle(btn).backgroundColor
    // We need to set a new background color, and unfortunately,
    // the existing background color is set with "!important".
    // As a result, the only way to override this existing color is to
    // *also* use "!important".
    const setHover = () => {
      btn.style.setProperty(
        "background-color",
        hoverBackgroundColor,
        "important"
      )
    }
    const unsetHover = () => {
      btn.style.setProperty(
        "background-color",
        regularBackgroundColor,
        "important"
      )
    }
    btn.onmouseenter = setHover
    btn.onmouseleave = unsetHover
    unsetHover()

    // prepopulate ticket submission form
    if (SETTINGS.program) {
      const programSlug = SETTINGS.program.slug
      btn.onclick = () => {
        // Apparently we can't modify the ticket submission form *immediately*
        // on the click event -- I assume that the Javascript that Zendesk runs
        // re-renders the form immediately, which would override any modification
        // that might happen here. Instead, we use `wait` to modify the
        // form after a short delay. This way, we modify the re-rendered version,
        // and the changes we make will be visible to the user.
        wait(100).then(() => {
          const ticketIFrame = document.querySelector(
            "iframe.zEWidget-ticketSubmissionForm"
          )
          let select = ticketIFrame.contentDocument.querySelector("select")
          const optionValues = _.map(select.options, "value")
          if (optionValues.includes(programSlug)) {
            select.value = programSlug
          }
        })
      }
    }
  },
  ticketSubmissionFormLoaded: () => {
    const iframe = document.querySelector(
      "iframe.zEWidget-ticketSubmissionForm"
    )

    const fieldSelector = name =>
      `input[name="${name}"], select[name="${name}"]`
    const fieldElement = name =>
      iframe.contentDocument.querySelector(fieldSelector(name))

    // Zendesk uses the ID 24690866 to refer to the MicroMasters program selector
    const programFieldName = "24690866"
    const fieldVisibility = {
      name: !(
        SETTINGS.user &&
        SETTINGS.user.first_name &&
        SETTINGS.user.last_name
      ),
      email:              !(SETTINGS.user && SETTINGS.user.email),
      [programFieldName]: !(SETTINGS.program && SETTINGS.program.slug)
    }

    const adjustFieldsVisibility = R.map(name => {
      if (!fieldVisibility[name]) {
        const element = fieldElement(name)
        if (element) {
          const label = element.parentNode.parentNode
          if (label.tagName.toLowerCase() === "label") {
            label.style.setProperty("display", "none", "important")
          }
        }
      }
    })

    adjustFieldsVisibility(["name", "email", programFieldName])

    // adjust the iframe to the correct (smaller) height
    const height = iframe.contentDocument.body.childNodes[0].offsetHeight
    // zendesk adds a 15px margin
    iframe.style.height = `${height + 15}px`
  }
}

const setupZendeskCallbacks = () => {
  const zendeskIFrames = ["launcher", "ticketSubmissionForm", "nps", "ipm"]
  for (const name of zendeskIFrames) {
    zendeskPollForExistence(name)
  }
}

const zendeskPollForExistence = name => {
  let tries = 0
  const intervalID = setInterval(() => {
    tries += 1
    const iframe = document.querySelector(`iframe.zEWidget-${name}`)
    if (iframe) {
      clearInterval(intervalID)
      zendeskPollForLoaded(name)
      const callback = zendeskCallbacks[`${name}Exists`]
      if (callback) {
        callback()
      }
    } else if (tries > 100) {
      // max 100 tries (10 seconds)
      console.error(`couldn't find Zendesk iframe: ${name}`) // eslint-disable-line no-console
      clearInterval(intervalID)
    }
  }, 100) // check every 100 milliseconds
}

const zendeskPollForLoaded = name => {
  let tries = 0
  let iframeDocument = null
  const intervalID = setInterval(() => {
    tries += 1
    const iframe = document.querySelector(`iframe.zEWidget-${name}`)
    try {
      iframeDocument = iframe.contentDocument
    } catch (err) {
      // cross-domain exception: can't continue
    }
    if (!iframeDocument) {
      console.error(`Can't access content of Zendesk iframe: ${name}`) // eslint-disable-line no-console
      clearInterval(intervalID)
      return
    }

    const div = iframeDocument.querySelector("div")
    if (div) {
      clearInterval(intervalID)
      const callback = zendeskCallbacks[`${name}Loaded`]
      if (callback) {
        callback()
      }
    } else if (tries > 100) {
      // max 100 tries (10 seconds)
      console.error(`couldn't load Zendesk iframe: ${name}`) // eslint-disable-line no-console
      clearInterval(intervalID)
    }
  }, 100) // check every 100 milliseconds
}

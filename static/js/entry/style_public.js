__webpack_public_path__ = `${SETTINGS.public_path}` // eslint-disable-line no-undef, camelcase

// jquery imported here since style_public.js is loaded before public.js
import $ from "jquery"
window.jQuery = $
window.$ = $

import "../../scss/public_style/web-icons.css"
import "../../scss/public_style/bootstrap-extend.css"
import "rrssb/css/rrssb.css"

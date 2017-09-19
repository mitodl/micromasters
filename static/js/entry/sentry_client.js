/* global SETTINGS: false */
__webpack_public_path__ = `${SETTINGS.public_path}` // eslint-disable-line no-undef, camelcase
import Raven from "raven-js"

Raven.config(SETTINGS.sentry_dsn, {
  release:     SETTINGS.release_version,
  environment: SETTINGS.environment
}).install()

window.Raven = Raven

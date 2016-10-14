/* global SETTINGS: false */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase
import Raven from 'raven-js';

Raven.config(SETTINGS.sentry_dsn, {
  release: SETTINGS.release_version,
  environment: SETTINGS.environment
}).install();

window.Raven = Raven;

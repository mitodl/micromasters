/* global SETTINGS:false */
import Raven from 'raven-js';

Raven.config(SETTINGS.sentry_dsn, {
  release: SETTINGS.release_version,
  environment: SETTINGS.environment
}).install();

window.Raven = Raven;

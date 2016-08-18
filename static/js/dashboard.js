/* global SETTINGS:false */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase
import ReactDOM from 'react-dom';

import configureStore from './store/configureStore';
import ga from 'react-ga';
import { browserHistory } from 'react-router';
import { makeDashboardRoutes } from './dashboard_routes';

// requirements for react-mdl which uses a modified version of material-design-lite
import 'react-mdl/extra/material.js';

// Object.entries polyfill
import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

// material-ui requirement
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

const store = configureStore();

let debug = SETTINGS.reactGaDebug === "true";
ga.initialize(SETTINGS.gaTrackingID, { debug: debug });

ReactDOM.render(
  makeDashboardRoutes(
    browserHistory,
    store,
    () => ga.pageview(window.location.pathname)
  ),
  document.getElementById("dashboard")
);

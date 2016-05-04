/* global SETTINGS:false */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase
import ReactDOM from 'react-dom';

import configureStore from './store/configureStore';
import ga from 'react-ga';
import { browserHistory } from 'react-router';
import { makeDashboardRoutes } from './dashboard_routes';

// requirements for react-mdl which uses a modified version of material-design-lite
import 'style!css!react-mdl/extra/material.css';
import 'react-mdl/extra/material.js';

// requirements for react-select
import 'style!css!react-select/dist/react-select.css';

// requirement for react-datepicker
import 'style!css!react-datepicker/dist/react-datepicker.css';

import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

// requirement for dialog-polyfill
import 'style!css!dialog-polyfill/dialog-polyfill.css';

const store = configureStore();

let debug = SETTINGS.reactGaDebug === "true";
ga.initialize(SETTINGS.gaTrackingID, { debug: debug });

ReactDOM.render(
  makeDashboardRoutes(
    browserHistory,
    store,
    () => ga.pageview(window.location.pathname),
    process.env.NODE_ENV !== 'production'
  ),
  document.getElementById("dashboard")
);

require('react-hot-loader/patch');
/* global SETTINGS:false */
__webpack_public_path__ = `${SETTINGS.public_path}`;  // eslint-disable-line no-undef, camelcase
import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';

import configureStore from '../store/configureStore';
import ga from 'react-ga';
import { browserHistory } from 'react-router';
import DashboardRouter from '../DashboardRouter';
import { routes } from '../dashboard_routes';

// requirements for react-mdl which uses a modified version of material-design-lite
import 'react-mdl/extra/material.js';

// requirement for creating blob from crop canvas.
import 'blueimp-canvas-to-blob/js/canvas-to-blob.js';

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
if (SETTINGS.gaTrackingID) {
  ga.initialize(SETTINGS.gaTrackingID, { debug: debug });
}

const rootEl = document.getElementById("dashboard");

const renderApp = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component
        browserHistory={browserHistory}
        store={store}
        onRouteUpdate={() => ga.pageview(window.location.pathname)}
        routes={routes}
      />
    </AppContainer>,
    rootEl
  );
};

renderApp(DashboardRouter);

if (module.hot) {
  module.hot.accept('../DashboardRouter', () => {
    const DashboardRouterNext = require('../DashboardRouter').default;
    renderApp(DashboardRouterNext);
  });
}

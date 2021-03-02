// @flow
/* global SETTINGS: false */
import React from "react"
import { Router } from "react-router"
import { Provider } from "react-redux"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import type { Store } from "redux"

// eslint-disable-next-line require-jsdoc
export default class DashboardRouter extends React.Component {
  props: {
    browserHistory: Object,
    onRouteUpdate: () => void,
    store: Store,
    routes: Object
  }

  // eslint-disable-next-line require-jsdoc
  render() {
    const { browserHistory, onRouteUpdate, store, routes } = this.props

    return (
      <div>
        <MuiThemeProvider theme={createMuiTheme()}>
          <Provider store={store}>
            <Router
              history={browserHistory}
              onUpdate={onRouteUpdate}
              routes={routes}
            />
          </Provider>
        </MuiThemeProvider>
      </div>
    )
  }
}

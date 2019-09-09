// @flow
/* global SETTINGS: false */
import React from "react"
import { Router } from "react-router"
import { Provider } from "react-redux"
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles"
import type { Store } from "redux"

export default class DashboardRouter extends React.Component {
  props: {
    browserHistory: Object,
    onRouteUpdate: () => void,
    store: Store,
    routes: Object
  }

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

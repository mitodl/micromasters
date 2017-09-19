// @flow
/* global SETTINGS: false */
import React from "react"
import { Router } from "react-router"
import { Provider } from "react-redux"
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider"
import getMuiTheme from "material-ui/styles/getMuiTheme"
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
        <MuiThemeProvider muiTheme={getMuiTheme()}>
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

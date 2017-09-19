// @flow
/* global require:false, module:false */
import { compose, createStore, applyMiddleware } from "redux"
import thunkMiddleware from "redux-thunk"
import { createLogger } from "redux-logger"
import persistState, { mergePersistedState } from "redux-localstorage"
import filter from "redux-localstorage-filter"
import adapter from "redux-localstorage/lib/adapters/localStorage"
import configureTestStore from "redux-asserts"
import type { Reducer } from "redux"

import rootReducer from "../reducers"
import { INITIAL_SIGNUP_STATE } from "../reducers/signup_dialog"

const notProd = () => process.env.NODE_ENV !== "production"

const middleware = () => {
  let ware = [thunkMiddleware]
  if (notProd()) {
    ware.push(createLogger())
  }
  return applyMiddleware(...ware)
}

const devTools = () =>
  notProd() && window.devToolsExtension ? window.devToolsExtension() : f => f

const storage = paths => compose(filter(paths))(adapter(window.localStorage))

const createPersistentStore = persistence =>
  compose(persistence, middleware(), devTools())(createStore)

const createPersistentTestStore = persistence =>
  compose(persistence)(configureTestStore)

export default function configureStore(initialState: ?Object) {
  const persistence = persistState(
    storage(["currentProgramEnrollment"]),
    "redux"
  )

  const reducer = compose(mergePersistedState())(rootReducer)

  const store = createPersistentStore(persistence)(reducer, initialState)

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept("../reducers", () => {
      const nextRootReducer = require("../reducers")

      store.replaceReducer(nextRootReducer)
    })
  }

  return store
}

export const configureMainTestStore = (reducer: Reducer<*, *>) => {
  const persistence = persistState(
    storage(["currentProgramEnrollment"]),
    "redux"
  )

  return createPersistentTestStore(persistence)(reducer)
}

export const signupDialogStore = () => {
  return configureStore({ signupDialog: INITIAL_SIGNUP_STATE })
}

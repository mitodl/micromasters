// @flow
/* global SETTINGS: false */
import React from "react"
import { SearchkitManager, SearchkitProvider } from "searchkit"
import R from "ramda"
import _ from "lodash"

import { getDisplayName } from "../../util/util"
import { getCookie } from "redux-hammock/django_csrf_fetch"

import type { AvailableProgram } from "../../flow/enrollmentTypes"

type WithSearchkitManagerProps = {
  currentProgramEnrollment: ?AvailableProgram
}

const withSearchkitManager = (WrappedComponent: ReactClass<*>) => {
  class WithSearchkitManager extends React.Component {
    searchkit: SearchkitManager
    searchkitCanSearch: () => void

    props: WithSearchkitManagerProps

    constructor(props: Object) {
      super(props)

      this.searchkit = new SearchkitManager(SETTINGS.search_url, {
        httpHeaders: {
          "X-CSRFToken": getCookie("csrftoken")
        }
      })

      // delay execution of search until we have a program enrollment
      const delayPromise = new Promise(resolve => {
        this.searchkitCanSearch = resolve
      })

      const oldPromise = this.searchkit.registrationCompleted
      this.searchkit.registrationCompleted = Promise.all([
        oldPromise,
        delayPromise
      ])
    }

    componentDidMount() {
      const {
        props: { currentProgramEnrollment },
        searchkitCanSearch
      } = this

      if (!R.isNil(currentProgramEnrollment)) {
        // tell searchkit it can run the initial search. This function is a resolver, after the first time
        // it has no effect
        searchkitCanSearch()
      }
    }

    componentDidUpdate() {
      const {
        props: { currentProgramEnrollment },
        searchkitCanSearch
      } = this

      if (!R.isNil(currentProgramEnrollment)) {
        // tell searchkit it can run the initial search. This function is a resolver, after the first time
        // it has no effect
        searchkitCanSearch()
      }
    }

    render() {
      // Remove any filters that are still applied by searchkit, but don't appear in the querystring
      const hasFiltersOtherThanSelectedProgram =
        _.get(this, "searchkit.query.index.filters.length", 0) > 1
      if (
        window.location &&
        R.isEmpty(window.location.search) &&
        hasFiltersOtherThanSelectedProgram
      ) {
        this.searchkit.getQueryAccessor().keepOnlyQueryState()
      }

      return (
        <SearchkitProvider searchkit={this.searchkit}>
          <WrappedComponent {...this.props} searchkit={this.searchkit} />
        </SearchkitProvider>
      )
    }
  }

  WithSearchkitManager.displayName = `WithSearchkitManager(${getDisplayName(
    WrappedComponent
  )})`
  return WithSearchkitManager
}

export default withSearchkitManager

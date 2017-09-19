// @flow
import {
  StatefulAccessor,
  TermQuery,
  SearchkitComponent,
  State
} from "searchkit"
import _ from "lodash"
import qs from "qs"

import type { AvailableProgram } from "../flow/enrollmentTypes"

class ProgramFilterAccessor extends StatefulAccessor {
  constructor() {
    super()

    this.state = new State()
  }

  buildOwnQuery(query: Object) {
    const programId = this.state.getValue()
    if (_.isNil(programId)) {
      return query
    }
    return query.addFilter("program_filter", TermQuery("program.id", programId))
  }

  fromQueryObject() {
    // This space intentionally left blank
  }

  getQueryObject() {
    // Leave blank so that no query parameters are added to the query string
    return {}
  }
}

export default class ProgramFilter extends SearchkitComponent {
  props: {
    currentProgramEnrollment: AvailableProgram
  }

  _accessor = new ProgramFilterAccessor()

  defineAccessor() {
    return this._accessor
  }

  refreshSearchkit = (clearState: boolean) => {
    const { currentProgramEnrollment } = this.props

    if (_.isNil(currentProgramEnrollment)) {
      // programs not yet loaded
      return
    }

    if (this._accessor.state.getValue() !== currentProgramEnrollment.id) {
      if (clearState) {
        this.searchkit.resetState()
      }
      this._accessor.state = this._accessor.state.setValue(
        currentProgramEnrollment.id
      )

      if (_.isEmpty(this.searchkit.state) && !clearState) {
        // workaround weird searchkit behavior which removes query parameter state
        this.searchkit.searchFromUrlQuery(
          qs.parse(window.location.search.replace(/^\?/, ""))
        )
      } else {
        this.searchkit.search()
      }
    }
  }

  componentDidMount() {
    this.refreshSearchkit(false)
  }

  componentDidUpdate(prevProps: Object): void {
    const switchingPrograms = !_.isEqual(
      prevProps.currentProgramEnrollment,
      this.props.currentProgramEnrollment
    )
    this.refreshSearchkit(switchingPrograms)
  }

  render() {
    return null
  }
}

// @flow
import {
  StatefulAccessor,
  TermQuery,
  SearchkitComponent,
  State
} from "searchkit"
import _ from "lodash"
import R from "ramda"

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

  refreshSearchkit = () => {
    const { currentProgramEnrollment } = this.props

    // if the user switches programs we should wipe old filters and just apply the new program one
    if (this._accessor.state.getValue() !== currentProgramEnrollment.id) {
      this.searchkit.resetState()
      this._accessor.state = this._accessor.state.setValue(
        currentProgramEnrollment.id
      )

      this.searchkit.search()
    }
  }

  componentDidMount() {
    const { currentProgramEnrollment } = this.props
    // currentProgramEnrollment may be null if localStorage hasn't been populated with the enrollment,
    // which will happen on first load of the search page. In that case will get updated and we will
    // handle it in componentDidUpdate
    if (!R.isNil(currentProgramEnrollment)) {
      this._accessor.state = this._accessor.state.setValue(
        currentProgramEnrollment.id
      )
      // no explicit search here since searchkit will do an initial load and then
      // we will handle this in componentDidUpdate
    }
  }

  componentDidUpdate(prevProps: Object): void {
    const switchingPrograms = !_.isEqual(
      prevProps.currentProgramEnrollment,
      this.props.currentProgramEnrollment
    )
    if (switchingPrograms) {
      this.refreshSearchkit()
    }
  }

  render() {
    return null
  }
}

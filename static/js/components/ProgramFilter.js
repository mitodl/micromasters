// @flow
import {
  StatefulAccessor,
  TermQuery,
  SearchkitComponent,
  State,
} from 'searchkit';
import _ from 'lodash';

import type { AvailableProgram } from '../flow/enrollmentTypes';

class ProgramFilterAccessor extends StatefulAccessor {
  constructor() {
    super();

    this.state = new State();
  }

  buildOwnQuery(query: Object) {
    const programId = this.state.getValue();
    if (_.isNil(programId)) {
      return query;
    }
    return query.addFilter("program_filter", TermQuery("program.id", programId));
  }

  fromQueryObject() {
    // This space intentionally left blank
  }

  getQueryObject() {
    // Leave blank so that no query parameters are added to the query string
    return {};
  }
}

export default class ProgramFilter extends SearchkitComponent {
  props: {
    currentProgramEnrollmentId: number,
  };

  _accessor = new ProgramFilterAccessor();

  defineAccessor() {
    return this._accessor;
  }

  refreshSearchkit = (clearState: bool) => {
    const { currentProgramEnrollmentId } = this.props;

    if (this._accessor.state.getValue() !== currentProgramEnrollmentId) {
      if (clearState) {
        this.searchkit.resetState();
      }
      this._accessor.state = this._accessor.state.setValue(currentProgramEnrollmentId);
      this.searchkit.registrationCompleted.then(() => {
        this.searchkit._searchWhenCompleted(window.location);
      });
    }
  };

  componentDidMount() {
    this.refreshSearchkit(false);
  }

  componentDidUpdate(prevProps: Object): void {
    const switchingPrograms = !_.isEqual(prevProps.currentProgramEnrollmentId, this.props.currentProgramEnrollmentId);
    this.refreshSearchkit(switchingPrograms);
  }

  render() {
    return null;
  }
}

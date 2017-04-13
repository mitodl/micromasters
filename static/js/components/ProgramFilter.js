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
    let programId = this.state.getValue();
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
    currentProgramEnrollment: AvailableProgram,
  };

  _accessor = new ProgramFilterAccessor();


  defineAccessor() {
    return this._accessor;
  }

  refreshSearchkit = () => {
    const { currentProgramEnrollment } = this.props;

    if (_.isNil(currentProgramEnrollment)) {
      // programs aren't loaded yet
      return;
    }

    if (this._accessor.state.getValue() !== currentProgramEnrollment.id) {
      this._accessor.state = this._accessor.state.setValue(currentProgramEnrollment.id);
      this.searchkit.performSearch();
    }
  };

  componentDidMount() {
    this.refreshSearchkit();
  }

  componentDidUpdate(prevProps: Object): void {
    if (!_.isEqual(prevProps.currentProgramEnrollment, this.props.currentProgramEnrollment)) {
      this.refreshSearchkit();
    }
  }

  render() {
    return null;
  }
}

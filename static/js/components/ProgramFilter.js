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

  buildOwnQuery(query) {
    let programId = this.state.getValue();
    if (_.isNil(programId)) {
      return query;
    }
    return query.addFilter("program_filter", TermQuery("program.id", programId));
  }

  fromQueryObject(ob: any) {
    // This space intentionally left blank
  }

  getQueryObject() {
    // Leave blank so that no query parameters are added to the query string
    return {};
  };
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
      if (this.searchkit.currentSearchRequest) {
        // If there hasn't been a search request yet the value will be included as part of the initial
        // search, so no need for an explicit search. Otherwise we need to trigger this to tell
        // searchkit that we changed something.
        this.searchkit.performSearch();
      }
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

// @flow
import {
  AnonymousAccessor,
  TermQuery,
  SearchkitComponent,
} from 'searchkit';
import _ from 'lodash';

import type { AvailableProgram } from '../flow/enrollmentTypes';

export default class ProgramFilter extends SearchkitComponent {
  props: {
    currentProgramEnrollment: AvailableProgram,
  };

  _accessor = new AnonymousAccessor(query => {
    const { currentProgramEnrollment } = this.props;
    if (_.isNil(currentProgramEnrollment)) {
      return query;
    }
    return query.addFilter("program_filter", TermQuery("program.id", currentProgramEnrollment.id));
  });


  defineAccessor() {
    return this._accessor;
  }

  refreshSearchkit = () => {
    // (╯°□°)╯︵ ┻━┻
    this.context.searchkit.resetState();
    this.context.searchkit.reloadSearch();
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

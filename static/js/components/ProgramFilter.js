// @flow
import {
  AnonymousAccessor,
  BoolMust,
  FilteredQuery,
  TermQuery,
  SearchkitComponent,
  FilterBasedAccessor,
} from 'searchkit';
import _ from 'lodash';

export default class ProgramFilter extends SearchkitComponent {
  _accessor = new AnonymousAccessor(query => {
    const { currentProgramEnrollment } = this.props;
    if (currentProgramEnrollment === null) {
      return query;
    }
    return query.addFilter("program_filter", TermQuery("program.id", currentProgramEnrollment.id));
  });


  defineAccessor() {
    return this._accessor;
  }

  componentDidUpdate(...args) {
    if (super.componentDidUpdate) {
      super.componentDidUpdate(...args);
    }
    const [prevProps] = args;
    if (!_.isEqual(prevProps.currentProgramEnrollment, this.props.currentProgramEnrollment)) {
      // (╯°□°)╯︵ ┻━┻
      this.context.searchkit.reloadSearch();
    }
  }

  render() {
    return null;
  }
}
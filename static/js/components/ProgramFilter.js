// @flow
import {
  AnonymousAccessor,
  BoolMust,
  FilteredQuery,
  TermQuery,
  SearchkitComponent,
} from 'searchkit';
import _ from 'lodash';

export default class ProgramFilter extends SearchkitComponent {
  accessor = new AnonymousAccessor(query => {
    const { currentProgramEnrollment } = this.props;
    if (currentProgramEnrollment === null) {
      return query;
    }
    return query.addFilter("program.id", TermQuery("program.id", currentProgramEnrollment.id));
  });


  defineAccessor() {
    return this.accessor;
  }

  componentDidUpdate(...args) {
    if (super.componentDidUpdate) {
      super.componentDidUpdate(...args);
    }
    const [prevProps] = args;
    if (!_.isEqual(prevProps.currentProgramEnrollment, this.props.currentProgramEnrollment)) {
      // (╯°□°)╯︵ ┻━┻
      this.context.searchkit.performSearch();
    }
  }

  render() {
    return null;
  }
}
import React from 'react';
import {
  AnonymousAccessor,
  BoolMust,
  FilteredQuery,
  TermQuery,
  SearchkitComponent,
} from 'searchkit';
import _ from 'lodash';

export default class ProgramFilter extends SearchkitComponent {
  defineAccessor() {
    return new AnonymousAccessor(query => {
      const { currentProgramEnrollment } = this.props;
      console.trace();
      console.log("accessor", currentProgramEnrollment);
      if (currentProgramEnrollment === null) {
        return query;
      }
      return query.addQuery(FilteredQuery({
        filter: BoolMust([
          TermQuery("program.id", currentProgramEnrollment.id)
        ])
      }));
    });
  }

  componentDidUpdate(...args) {
    if (super.componentWillUpdate) {
      super.componentWillUpdate(...args);
    }
    const [prevProps] = args;
    if (!_.isEqual(prevProps.currentProgramEnrollment, this.props.currentProgramEnrollment)) {
      // searchkit  (╯°□°)╯︵ ┻━┻
      this.context.searchkit.reloadSearch();
    }
  }

  render() {
    return null;
  }
}
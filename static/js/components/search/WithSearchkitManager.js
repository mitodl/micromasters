// @flow
/* global SETTINGS: false */
import React from 'react';
import { SearchkitManager, SearchkitProvider } from 'searchkit';
import R from 'ramda';
import _ from 'lodash';

import { getDisplayName } from '../../util/util';
import { getCookie } from 'redux-hammock/django_csrf_fetch';

const withSearchkitManager = (WrappedComponent: ReactClass<*>) => {
  class WithSearchkitManager extends React.Component {
    searchkit: SearchkitManager;

    constructor(props: Object) {
      super(props);

      this.searchkit = new SearchkitManager(SETTINGS.search_url, {
        httpHeaders: {
          'X-CSRFToken': getCookie('csrftoken')
        }
      });
    }

    render() {
      // Remove any filters that are still applied by searchkit, but don't appear in the querystring
      let hasFiltersOtherThanSelectedProgram = _.get(this, 'searchkit.query.index.filters.length', 0) > 1;
      if (window.location && R.isEmpty(window.location.search) && hasFiltersOtherThanSelectedProgram) {
        this.searchkit.getQueryAccessor().keepOnlyQueryState();
      }

      return <SearchkitProvider searchkit={this.searchkit}>
        <WrappedComponent
          {...this.props}
          searchkit={this.searchkit}
        />
      </SearchkitProvider>;
    }
  }

  WithSearchkitManager.displayName = `WithSearchkitManager(${getDisplayName(WrappedComponent)})`;
  return WithSearchkitManager;
};

export default withSearchkitManager;

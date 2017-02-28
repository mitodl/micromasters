// @flow
/* global SETTINGS: false */
import React from 'react';
import { SearchkitManager, SearchkitProvider } from 'searchkit';

import { getDisplayName } from '../../util/util';
import { getCookie } from '../../lib/api';

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

// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import {
  SearchkitManager,
  SearchkitProvider,
} from 'searchkit';
import _ from 'lodash';
import type { Dispatch } from 'redux';

import LearnerSearch from '../components/LearnerSearch';
import { setSearchFilterVisibility } from '../actions/ui';
import type { UIState } from '../reducers/ui';
import { getCookie } from '../util/api';

class LearnerSearchPage extends React.Component {
  props: {
    ui:       UIState,
    dispatch: Dispatch,
  };

  checkFilterVisibility: Function = (filterName: string): boolean => {
    const { ui: { searchFilterVisibility } } = this.props;
    let visibility = searchFilterVisibility[filterName];
    return visibility === undefined ? false : visibility;
  };

  setFilterVisibility: Function = (filterName: string, visibility: boolean): void => {
    const { ui: { searchFilterVisibility }, dispatch } = this.props;
    let clone = _.clone(searchFilterVisibility);
    clone[filterName] = visibility;
    dispatch(setSearchFilterVisibility(clone));
  };

  render () {
    let searchKit = new SearchkitManager(SETTINGS.search_url, {
      httpHeaders: {
        'X-CSRFToken': getCookie('csrftoken')
      }
    });
    return (
      <SearchkitProvider searchkit={searchKit}>
        <LearnerSearch
          checkFilterVisibility={this.checkFilterVisibility}
          setFilterVisibility={this.setFilterVisibility}
        />
      </SearchkitProvider>
    );
  }
}

const mapStateToProps = state => {
  return {
    ui: state.ui,
  };
};

export default connect(mapStateToProps)(LearnerSearchPage);

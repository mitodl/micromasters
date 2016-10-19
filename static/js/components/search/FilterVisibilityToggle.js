// @flow
import React from 'react';
import _ from 'lodash';
import { SearchkitComponent } from 'searchkit';
import Icon from 'react-mdl/lib/Icon';

export default class FilterVisibilityToggle extends SearchkitComponent {
  props: {
    filterName:             string,
    checkFilterVisibility:  (filterName: string) => boolean,
    setFilterVisibility:    (filterName: string, visibility: boolean) => void,
    children:               React$Element<*>[],
  };

  openClass: Function = (): string => {
    const { filterName, checkFilterVisibility } = this.props;
    return checkFilterVisibility(filterName) ? "" : "closed";
  };

  isInResults: Function = (id: string): boolean => {
    if (this.getResults()) {
      const elmId = (id === "birth_location") ? "profile.birth_country3" : id;
      const docCount = _.get(this.getResults(), ['aggregations', elmId, 'doc_count'], 0);

      if (docCount > 0) {
        return true;
      }
    }
    return false;
  }

  openStateIcon: Function = (children: React$Element<*>): React$Element<*>|null => {
    if (!this.isInResults(children.props.id)) {
      return null;
    }

    return <Icon
      name="arrow_drop_down"
      onClick={this.toggleFilterVisibility}
      className={this.openClass()}
    />;
  }

  toggleFilterVisibility: Function = (): void => {
    const {
      filterName,
      checkFilterVisibility,
      setFilterVisibility,
    } = this.props;
    setFilterVisibility(
      filterName,
      !checkFilterVisibility(filterName)
    );
  };

  render () {
    const { children } = this.props;
    return (
      <div className={`filter-visibility-toggle ${this.openClass()}`}>
        { this.openStateIcon(children) }
        { children }
      </div>
    );
  }
}

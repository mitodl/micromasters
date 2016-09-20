// @flow
import React from 'react';
import Icon from 'react-mdl/lib/Icon';

export default class FilterVisibilityToggle extends React.Component {
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

  openStateIcon: Function = (): React$Element<*> => (
    <Icon
      name="arrow_drop_down"
      onClick={this.toggleFilterVisibility}
      className={this.openClass()}
    />
  );

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
        { this.openStateIcon() }
        { children }
      </div>
    );
  }
}

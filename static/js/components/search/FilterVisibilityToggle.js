// @flow
import React from 'react';
import R from 'ramda';
import { SearchkitComponent } from 'searchkit';
import Icon from 'react-mdl/lib/Icon';

export const FILTER_ID_ADJUST = {
  "birth_location": "profile.birth_country",
  "semester": "program.semester_enrollments.semester",
  "education_level": "profile.education.degree_name",
  "company_name": "profile.work_history.company_name"
};

export default class FilterVisibilityToggle extends SearchkitComponent {
  props: {
    filterName:             string,
    checkFilterVisibility:  (filterName: string) => boolean,
    setFilterVisibility:    (filterName: string, visibility: boolean) => void,
    children:               React$Element<*>,
  };

  openClass = (): string => {
    const { filterName, checkFilterVisibility } = this.props;
    return checkFilterVisibility(filterName) ? "" : "closed";
  };

  getChildFacetDocCount = (results: Object, resultIdPrefix: string): number => {
    const matchingAggKey = R.compose(
      R.find(
        // Accept keys that start with the given prefix and end with numbers
        key => (
          key.startsWith(resultIdPrefix) && !isNaN(key.substring(resultIdPrefix.length))
        )
      ),
      R.keys
    )(results.aggregations);

    if (!matchingAggKey) {
      return 0;
    }

    let elementResult = results.aggregations[matchingAggKey];
    if (elementResult['inner']) {
      return elementResult['inner']['doc_count'];
    } else {
      return elementResult['doc_count'];
    }
  };

  isInResults = (id: string): boolean => {
    let results = this.getResults();
    if (results) {
      const resultIdPrefix = FILTER_ID_ADJUST[id] || id;
      const docCount = this.getChildFacetDocCount(results, resultIdPrefix);
      if (docCount > 0) {
        return true;
      }
    }
    return false;
  };

  openStateIcon = (children: React$Element<*>): React$Element<*>|null => {
    if (!this.isInResults(children.props.id)) {
      return null;
    }

    return <Icon
      name="arrow_drop_down"
      onClick={this.toggleFilterVisibility}
      className={this.openClass()}
    />;
  };

  toggleFilterVisibility = (): void => {
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

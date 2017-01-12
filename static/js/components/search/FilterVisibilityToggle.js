// @flow
import React from 'react';
import _ from 'lodash';
import { SearchkitComponent } from 'searchkit';
import Icon from 'react-mdl/lib/Icon';

const FILTER_ID_ADJUST = {
  "birth_location": "profile.birth_country5",
  "semester": "program.semester_enrollments.semester4",
  "education_level": "profile.education.degree_name7",
  "company_name": "profile.work_history.company_name11"
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

  getChildFacetDocCount = (results: Object, resultId: string): number => {
    const elementResult = _.get(results, ['aggregations', resultId]);
    if (elementResult['inner']) {
      return elementResult['inner']['doc_count'];
    } else {
      return elementResult['doc_count'];
    }
  };

  isInResults = (id: string): boolean => {
    let results = this.getResults();
    if (results) {
      const resultId = FILTER_ID_ADJUST[id] || id;
      const docCount = this.getChildFacetDocCount(results, resultId);
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

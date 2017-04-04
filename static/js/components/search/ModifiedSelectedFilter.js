import React from 'react';
import { SEARCH_FACET_FIELD_LABEL_MAP } from '../../constants';
import { makeCountryNameTranslations } from '../LearnerSearch';

export default class ModifiedSelectedFilter extends React.Component {
  props: {
    labelKey: string,
    labelValue: string,
    removeFilters: Function,
    bemBlocks?: any,
    filterId: string
  };

  countryNameTranslations: Object = makeCountryNameTranslations();

  render() {
    let {
      labelKey,
      labelValue,
      removeFilter,
      bemBlocks,
      filterId,
    } = this.props;

    if (labelKey in SEARCH_FACET_FIELD_LABEL_MAP) {
      labelKey = SEARCH_FACET_FIELD_LABEL_MAP[labelKey];
    } else if (labelKey in this.countryNameTranslations) {
      labelKey = this.countryNameTranslations[labelKey];
    }
    if (labelValue in this.countryNameTranslations) {
      labelValue = this.countryNameTranslations[labelValue];
    }
    // This comes from searchkit documentation on "Overriding Selected Filter Component"
    return (
      <div className={bemBlocks.option().mix(bemBlocks.container("item")).mix(`selected-filter--${filterId}`)()}>
        <div className={bemBlocks.option("name")}>{labelKey}: {labelValue}</div>
        <div className={bemBlocks.option("remove-action")} onClick={removeFilter}>x</div>
      </div>
    );
  }
}

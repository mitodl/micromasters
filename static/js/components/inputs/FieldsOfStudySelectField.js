// @flow
import React from 'react';
import _ from 'lodash';
import SelectField from './SelectField';
import {
  caseInsensitiveFilter,
  showLimitedOptions,
  highlightMatchedOptionText
} from '../utils/AutoCompleteSettings';
import FIELDS_OF_STUDY from '../../fields_of_study';

let fieldOfStudyOptions = _.map(FIELDS_OF_STUDY, (name, code) => ({
  value: code,
  label: name
}));

export default class FieldsOfStudySelectField extends React.Component {
  static propTypes = {
    maxSearchResults: React.PropTypes.number
  };

  static defaultProps = {
    maxSearchResults: 10
  };

  static autocompleteStyleProps = {
    menuStyle: {maxHeight: 300},
    menuHeight: 300,
    listStyle: {width: '100%'},
    fullWidth: true
  };

  render() {
    return <SelectField
      options={fieldOfStudyOptions}
      autocompleteStyleProps={FieldsOfStudySelectField.autocompleteStyleProps}
      autocompleteBehaviors={[showLimitedOptions, highlightMatchedOptionText]}
      filter={caseInsensitiveFilter}
      {...this.props}
    />;
  }
}

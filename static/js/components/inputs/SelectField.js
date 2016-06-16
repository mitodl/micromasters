// @flow
import React from 'react';
import _ from 'lodash';
import AutoComplete from '../AutoComplete';
import type { Option } from '../../flow/generalTypes';


const caseInsensitivePrefixFilter: Function = (searchText: string, key: string): boolean => {
  let index = key.toLowerCase().indexOf(searchText.toLowerCase());
  return index === 0;
};

const showAllOptionSettings: Function = (): Object => {
  return {
    autocompleteFilter: caseInsensitivePrefixFilter,
    focusBehaviorProps: {
      openOnFocus: true
    }
  };
};

const showLimitedOptionSettings: Function = (optionDisplayProps: Object): Object => {
  return {
    autocompleteFilter: (searchText, key) => {
      return searchText !== '' ? caseInsensitivePrefixFilter(searchText, key) : false;
    },
    focusBehaviorProps: {
      openOnFocus: false,
      showOptionsWhenBlank: false,
      maxSearchResults: optionDisplayProps.resultLimit
    }
  };
};

export default class SelectField extends React.Component {
  constructor(props: Object) {
    super(props);
    const { resultLimit } = this.props;
    this.editKeySet = this.createEditKeySet();

    // Set some inter-related option display properties on this component
    let optionDisplayProps = { resultLimit: resultLimit };
    let optionDisplaySettingsFunc = resultLimit ? showLimitedOptionSettings : showAllOptionSettings;
    _.assignIn(this, optionDisplaySettingsFunc(optionDisplayProps));
  }

  // type declarations
  editKeySet: string[];
  autocompleteFilter: Function;
  focusBehaviorProps: Object;

  static propTypes = {
    profile:                  React.PropTypes.object.isRequired,
    autocompleteStyleProps:   React.PropTypes.object,
    errors:                   React.PropTypes.object,
    label:                    React.PropTypes.node,
    onChange:                 React.PropTypes.func,
    updateProfile:            React.PropTypes.func,
    resultLimit:              React.PropTypes.number,
    keySet:                   React.PropTypes.array,
    options:                  React.PropTypes.array
  };

  static defaultProps = {
    autocompleteStyleProps: {
      menuHeight: 300,
      menuStyle: {maxHeight: 300},
      fullWidth: true
    }
  };

  createEditKeySet: Function = (): string[] => {
    const { keySet } = this.props;
    let editKeySet = keySet.concat();
    editKeySet[editKeySet.length - 1] = `${editKeySet[editKeySet.length - 1]}_edit`;
    return editKeySet;
  };

  onUpdateInput: Function = (searchText: string): void => {
    const {
      profile,
      updateProfile,
      keySet
    } = this.props;
    let clone = _.cloneDeep(profile);
    _.set(clone, this.editKeySet, searchText);
    _.set(clone, keySet, null);
    updateProfile(clone);
  };

  onBlur: Function = (): void => {
    // clear the edit value when we lose focus. In its place we will display
    // the selected option label if one is selected, or an empty string
    const { profile, updateProfile } = this.props;
    let clone = _.cloneDeep(profile);
    _.set(clone, this.editKeySet, undefined);
    updateProfile(clone);
  };

  onNewRequest: Function = (optionOrString: Option|string, index: number): void => {
    const {
      profile,
      updateProfile,
      keySet,
      options,
      onChange
    } = this.props;
    let clone = _.cloneDeep(profile);
    let toStore;
    if (index === -1) {
      // enter was pressed and optionOrString is a string
      // select first item in dropdown if any are present
      let filteredOptionValues = options.
        map(option => option.label).
        filter(this.autocompleteFilter.bind(this, optionOrString));
      if (filteredOptionValues.length > 0) {
        let option = options.find(option => option.label === filteredOptionValues[0]);
        toStore = option.value;
      }
    } else {
      // user selected an item in the menu
      toStore = optionOrString.value;
    }

    if (toStore !== undefined) {
      _.set(clone, keySet, toStore);
    } // else we couldn't figure out what the user wanted to select, so leave it as is
    _.set(clone, this.editKeySet, undefined);

    updateProfile(clone);
    if (_.isFunction(onChange)) {
      onChange(clone);
    }
  };

  autocompleteProps: Function = (): Object => {
    const {
      label,
      options,
      keySet,
      errors
    } = this.props;
    return Object.assign({}, {
      ref: "autocomplete",
      animated: false,
      menuCloseDelay: 0,
      filter: this.autocompleteFilter,
      dataSource: options,
      floatingLabelText: label,
      onNewRequest: this.onNewRequest,
      onUpdateInput: this.onUpdateInput,
      onBlur: this.onBlur,
      errorText: _.get(errors, keySet)
    }, this.props.autocompleteStyleProps, this.focusBehaviorProps);
  };

  getSearchText: Function = (): string => {
    const {
      profile,
      options,
      keySet
    } = this.props;

    let selectedValue = _.get(profile, keySet);
    let selectedOption = options.find(option => option.value === selectedValue);
    let searchText;
    let editText = _.get(profile, this.editKeySet);
    if (editText !== undefined) {
      searchText = editText;
    } else if (selectedOption) {
      searchText = selectedOption.label;
    } else {
      searchText = "";
    }
    return searchText;
  };
  
  render() {
    return (
      <AutoComplete
        searchText={this.getSearchText()}
        {...this.autocompleteProps()}
      />
    );
  }
}

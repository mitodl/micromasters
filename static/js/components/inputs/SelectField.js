// @flow
import React from 'react';
import _ from 'lodash';
import AutoComplete from '../AutoComplete';
import { defaultFilter, showAllOptions } from '../utils/AutoCompleteSettings';
import { callFunctionArray, validationErrorSelector } from '../../util/util';
import type { Option } from '../../flow/generalTypes';
import type { Validator, UIValidator } from '../../util/validation';
import type {
  Profile,
  ValidationErrors,
  UpdateProfileFunc,
} from '../../flow/profileTypes';

class SelectField extends React.Component {
  constructor(props: Object) {
    super(props);
    this.editKeySet = this.createEditKeySet();
  }

  // type declarations
  editKeySet: string[];

  props: {
    id?:                      string,
    profile:                  Profile,
    autocompleteStyleProps:   Object,
    autocompleteBehaviors:    Array<any>,
    errors:                   ValidationErrors,
    label:                    Node,
    onChange:                 Function,
    updateProfile:            UpdateProfileFunc,
    maxSearchResults:         number,
    keySet:                   Array<string>,
    options:                  Array<Option>,
    validator:                Validator|UIValidator,
  };

  static defaultProps = {
    autocompleteStyleProps: {
      menuHeight: 300,
      menuStyle: {maxHeight: 300},
      fullWidth: true
    },
    autocompleteBehaviors: [showAllOptions]
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
      keySet,
      validator,
    } = this.props;
    let clone = _.cloneDeep(profile);
    _.set(clone, this.editKeySet, searchText);
    _.set(clone, keySet, null);
    updateProfile(clone, validator);
  };

  onBlur: Function = (): void => {
    // clear the edit value when we lose focus. In its place we will display
    // the selected option label if one is selected, or an empty string
    const { profile, updateProfile, validator } = this.props;
    let clone = _.cloneDeep(profile);
    _.set(clone, this.editKeySet, undefined);
    updateProfile(clone, validator);
  };

  onNewRequest: Function = (optionOrString: Option|string, index: number): void => {
    const {
      profile,
      updateProfile,
      keySet,
      options,
      onChange,
      validator,
    } = this.props;
    let clone = _.cloneDeep(profile);
    let toStore;
    if (index === -1) {
      // enter was pressed and optionOrString is a string
      // select first item in dropdown if any are present
      let autocompleteProps = this.getAutocompleteProps();
      let filterFunction = _.has(autocompleteProps, 'filter') ?
        autocompleteProps.filter :
        defaultFilter;
      let firstMatchingOption = options.find((option) => filterFunction(optionOrString, option.label));
      if (firstMatchingOption) {
        toStore = firstMatchingOption.value;
      }
    } else {
      // user selected an item in the menu
      if ( typeof optionOrString !== 'string' ) {
        toStore = optionOrString.value;
      }
    }

    if (toStore !== undefined) {
      _.set(clone, keySet, toStore);
    } // else we couldn't figure out what the user wanted to select, so leave it as is
    _.set(clone, this.editKeySet, undefined);

    updateProfile(clone, validator);
    if (_.isFunction(onChange)) {
      onChange(clone);
    }
  };

  getAutocompleteProps: Function = (): Object => {
    const {
      autocompleteBehaviors,
      autocompleteStyleProps,
      label,
      options,
      keySet,
      errors
    } = this.props;
    // Call the autocompleteBehaviors array in series and combine their results into a single object to pass as props
    let autocompleteProps = Object.assign({}, ...callFunctionArray(autocompleteBehaviors, this.props));
    return Object.assign({}, {
      ref: "autocomplete",
      animated: false,
      menuCloseDelay: 0,
      dataSource: options,
      floatingLabelText: label,
      onNewRequest: this.onNewRequest,
      onUpdateInput: this.onUpdateInput,
      onBlur: this.onBlur,
      errorText: _.get(errors, keySet)
    }, autocompleteStyleProps, autocompleteProps);
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
    const { errors, keySet, id } = this.props;
    return (
      <AutoComplete
        id={id}
        className={validationErrorSelector(errors, keySet)}
        searchText={this.getSearchText()}
        {...this.getAutocompleteProps()}
      />
    );
  }
}

export default SelectField;

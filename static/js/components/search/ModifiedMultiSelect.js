/**
 * Created by anna on 1/9/17.
 */
import React from 'react';
import Select from 'react-select';
import _ from 'lodash';


export default class ModifiedMultiSelect extends React.Component {

  constructor(props){
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(selectedOptions = []) {
    this.props.setItems(selectedOptions.map(el => el.value));
  }
  render(){
    const { placeholder, clearable = true, items, selectedItems = [], disabled, showCount } = this.props;

    const options = items.map((option) => {
      let label = option.title || option.label || option.key;
      if (showCount && !_.isNil(option.company_name_count)){
        label += ` (${option.company_name_count.doc_count}) `;
      }
      return { value: option.key, label };
    });

    return (
      <Select multi disabled={disabled}
        value={selectedItems}
        placeholder={placeholder}
        options={options}
        valueRenderer={(v) => v.value}
        clearable={clearable}
        onChange={this.handleChange} />
    );
  }

}

// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import R from 'ramda';

import type { SearchSortItem } from '../../flow/searchTypes';

const nameKeys = ['name_a_z', 'name_z_a'];
const locationKeys = ['loc-a-z', 'loc-z-a'];
const gradeKeys = ['grade-high-low', 'grade-low-high'];

export default class CustomSortingColumnHeaders extends React.Component {
  // these props are all passed down by searchkit
  props: {
    // A list of available options for sorting
    items: Array<SearchSortItem>,
    // A function to set the new sorting keys
    setItems: (keys: Array<string>) => void,
    // The currently selected set of sorting keys, if any are selected
    selectedItems: ?Array<string>,
  };

  toggleSort = ([defaultSort, otherSort]: [string, string]) => {
    const { setItems, selectedItems } = this.props;
    if (selectedItems && selectedItems[0] === defaultSort) {
      setItems([otherSort]);
    } else {
      setItems([defaultSort]);
    }
  };

  toggleNameSort = R.partial(this.toggleSort, [nameKeys]);
  toggleLocationSort = R.partial(this.toggleSort, [locationKeys]);
  toggleGradeSort = R.partial(this.toggleSort, [gradeKeys]);

  sortDirection = (keys: [string, string]) => {
    let selectedItem = this.getSelectedItem(keys);
    if (!selectedItem) {
      return '';
    }
    let order;
    if (selectedItem.order) {
      order = selectedItem.order;
    } else if (selectedItem.fields) {
      order = selectedItem.fields[0].options.order;
    }

    if (order === 'desc') {
      return '▼';
    } else if (order === 'asc') {
      return '▲';
    }
    return '';
  };

  getSelectedItem = (keys: [string, string]) => {
    const { selectedItems, items } = this.props;
    if (!selectedItems) {
      return '';
    }
    return items.find(item => selectedItems[0] === item.key && keys.includes(item.key));
  };

  selectedClass = (keys: [string, string]) => {
    return this.getSelectedItem(keys) ? 'selected' : '';
  };

  render() {
    return (
      <Grid className="sorting-row">
        <Cell col={1}/>
        <Cell col={3} onClick={this.toggleNameSort} className={`name ${this.selectedClass(nameKeys)}`}>
          Name {this.sortDirection(nameKeys)}
        </Cell>
        <Cell
          col={4}
          onClick={this.toggleLocationSort}
          className={`residence ${this.selectedClass(locationKeys)}`}
        >
          Residence {this.sortDirection(locationKeys)}
        </Cell>
        <Cell
          col={3}
          onClick={this.toggleGradeSort}
          className={`grade ${this.selectedClass(gradeKeys)}`}
        >
          Program grade {this.sortDirection(gradeKeys)}
        </Cell>
        <Cell col={1}/>
      </Grid>
    );
  }
}

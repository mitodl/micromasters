// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';

import type { SearchSortItem } from '../../flow/searchTypes';

export default class CustomSortingColumnHeaders extends React.Component {
  props: {
    items: Array<SearchSortItem>,
    setItems: (keys: Array<string>) => void,
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
    let selectedItem = this.getSelectedItem(keys);
    return selectedItem ? 'selected' : '';
  };

  render() {
    const nameKeys = ['name_a_z', 'name_z_a'];
    const locationKeys = ['loc-a-z', 'loc-z-a'];
    const gradeKeys = ['grade-high-low', 'grade-low-high'];

    return (
      <Grid className="sorting-row">
        <Cell col={1}/>
        <Cell col={3} onClick={() => this.toggleSort(nameKeys)} className={`name ${this.selectedClass(nameKeys)}`}>
          Name {this.sortDirection(nameKeys)}
        </Cell>
        <Cell
          col={4}
          onClick={() => this.toggleSort(locationKeys)}
          className={`residence ${this.selectedClass(locationKeys)}`}
        >
          Residence {this.sortDirection(locationKeys)}
        </Cell>
        <Cell
          col={3}
          onClick={() => this.toggleSort(gradeKeys)}
          className={`grade ${this.selectedClass(gradeKeys)}`}
        >
          Program grade {this.sortDirection(gradeKeys)}
        </Cell>
        <Cell col={1}/>
      </Grid>
    );
  }
}

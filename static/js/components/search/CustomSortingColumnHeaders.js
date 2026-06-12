// @flow
/* global SETTINGS: false */
import React from "react"
import { connect } from "react-redux"
import Grid from "@material-ui/core/Grid"
import R from "ramda"

import { canAdvanceSearchProgram } from "../../lib/roles"
import type { SearchSortItem } from "../../flow/searchTypes"
import type { AvailableProgram } from "../../flow/enrollmentTypes"

const nameKeys = ["name_a_z", "name_z_a"]
const locationKeys = ["loc-a-z", "loc-z-a"]
const gradeKeys = ["grade-high-low", "grade-low-high"]

class CustomSortingColumnHeaders extends React.Component {
  // these props are all passed down by searchkit
  props: {
    // A list of available options for sorting
    items: Array<SearchSortItem>,
    // A function to set the new sorting keys
    setItems: (keys: Array<string>) => void,
    // The currently selected set of sorting keys, if any are selected
    selectedItems: ?Array<string>,
    // the currently selected program
    currentProgramEnrollment: AvailableProgram
  }

  toggleSort = ([defaultSort, otherSort]: [string, string]) => {
    const { setItems, selectedItems } = this.props
    if (selectedItems && selectedItems[0] === defaultSort) {
      setItems([otherSort])
    } else {
      setItems([defaultSort])
    }
  }

  toggleNameSort = R.partial(this.toggleSort, [nameKeys])
  toggleLocationSort = R.partial(this.toggleSort, [locationKeys])
  toggleGradeSort = R.partial(this.toggleSort, [gradeKeys])

  sortDirection = (keys: [string, string]) => {
    const selectedItem = this.getSelectedItem(keys)
    if (!selectedItem) {
      return ""
    }
    let order
    if (selectedItem.order) {
      order = selectedItem.order
    } else if (selectedItem.fields) {
      order = selectedItem.fields[0].options.order
    }

    if (order === "desc") {
      return "▼"
    } else if (order === "asc") {
      return "▲"
    }
    return ""
  }

  getSelectedItem = (keys: [string, string]) => {
    const { selectedItems, items } = this.props
    if (!selectedItems) {
      return ""
    }
    return items.find(
      item => selectedItems[0] === item.key && keys.includes(item.key)
    )
  }

  selectedClass = (keys: [string, string]) => {
    return this.getSelectedItem(keys) ? "selected" : ""
  }

  render() {
    const { currentProgramEnrollment } = this.props
    const showGrade = canAdvanceSearchProgram(
      currentProgramEnrollment,
      SETTINGS.roles
    )
    return (
      <Grid container className="sorting-row">
        <Grid item xs={1} />
        <Grid
          item
          xs={4}
          onClick={this.toggleNameSort}
          className={`name ${this.selectedClass(nameKeys)}`}
        >
          Name {this.sortDirection(nameKeys)}
        </Grid>
        <Grid
          item
          xs={showGrade ? 4 : 7}
          onClick={this.toggleLocationSort}
          className={`residence ${this.selectedClass(locationKeys)}`}
        >
          Residence {this.sortDirection(locationKeys)}
        </Grid>
        {showGrade ? (
          <Grid
            item
            xs={3}
            onClick={this.toggleGradeSort}
            className={`grade ${this.selectedClass(gradeKeys)}`}
          >
            Program grade {this.sortDirection(gradeKeys)}
          </Grid>
        ) : null}
      </Grid>
    )
  }
}

const mapStateToProps = R.pickAll(["currentProgramEnrollment"])

export default connect(mapStateToProps)(CustomSortingColumnHeaders)

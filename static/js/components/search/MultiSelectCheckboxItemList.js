// @flow
/* global event: false */
import _ from "lodash"
import * as React from "react"
import { SearchkitComponent, block } from "searchkit"

import CheckboxItem from "./CheckboxItem"

const selectAllInitialState = { allOptionClass: "" }

export default class MultiSelectCheckboxItemList extends SearchkitComponent {
  props: {
    itemComponent: CheckboxItem,
    toggleItem: Function,
    setItems: Function,
    items: Array<any>,
    selectedItems: Array<string>,
    disabled?: boolean,
    mod: string,
    className?: string,
    showCount?: boolean,
    translate: Function,
    multiselect: boolean
  }

  static defaultProps: any = {
    itemComponent: CheckboxItem,
    mod:           "sk-item-list",
    showCount:     true,
    multiselect:   true,
    selectItems:   []
  }

  constructor() {
    super()
    this.state = selectAllInitialState
  }

  isActive = (option: Object): boolean => {
    const { selectedItems, multiselect } = this.props
    if (multiselect) {
      return _.includes(selectedItems, option.key)
    } else {
      if (selectedItems.length === 0) {
        return false
      }
      return selectedItems[0] === option.key
    }
  }

  allItemsSelected = () => {
    const { selectedItems = [], items = [] } = this.props
    return selectedItems.length === items.length
  }

  allDocCount = () => {
    return this.getHitsCount()
  }

  rowClickHandler = () => {
    if (this.state.allOptionClass && this.allItemsSelected()) {
      this.checkBoxStateChangeHandler(false)
    } else {
      this.checkBoxStateChangeHandler(true)
    }
  }

  checkBoxStateChangeHandler = (newState: boolean) => {
    const { items = [], setItems } = this.props

    if (newState) {
      this.setState({ allOptionClass: "is-active" })
      setItems(items.map(item => item.key))
    } else {
      this.setState(selectAllInitialState)
      setItems([])
    }
  }

  itemComponentList = () => {
    const {
      items = [],
      multiselect,
      setItems,
      toggleItem,
      translate
    } = this.props
    const toggleFunc = multiselect ? toggleItem : key => setItems([key])

    return _.map(items, option => {
      const label: string = option.title || option.label || option.key
      const props = {
        label:   translate(label),
        onClick: () => toggleFunc(option.key),
        key:     option.key,
        count:   option.doc_count,
        active:  this.isActive(option)
      }
      return <CheckboxItem {...props} />
    })
  }

  allAction = (itemsSelected: boolean) => (
    <div
      className={`sk-item-list-option sk-item-list__item ${
        itemsSelected ? this.state.allOptionClass : ""
      }`}
      key="select-all-items"
      onClick={this.rowClickHandler}
    >
      <input
        type="checkbox"
        data-qa="checkbox"
        className="sk-item-list-option checkbox"
        checked={this.state.allOptionClass && itemsSelected}
        readOnly
      />
      <div className="sk-item-list-option__text facet-text">Select All</div>
      <div className="sk-item-list-option__count">{this.allDocCount()}</div>
    </div>
  )

  render() {
    const { mod, disabled, className } = this.props

    const bemBlocks = {
      container: block(mod).el,
      option:    block(`${mod}-option`).el
    }

    return (
      <div
        data-qa="options"
        className={bemBlocks
          .container()
          .mix(className)
          .state({ disabled })}
      >
        {[this.allAction(this.allItemsSelected()), ...this.itemComponentList()]}
      </div>
    )
  }
}

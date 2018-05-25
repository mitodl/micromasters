// @flow
/* global event: false */
import _ from "lodash"
import * as React from "react"
import { AbstractItemList, block } from "searchkit"
import R from "ramda"

import CheckboxItem from "./CheckboxItem"

const selectAllInitialState = { allOptionClass: "" }

export default class MultiSelectCheckboxItemList extends AbstractItemList {
  static defaultProps = _.defaults(
    {
      itemComponent: CheckboxItem
    },
    AbstractItemList.defaultProps
  )

  constructor() {
    super()
    this.state = selectAllInitialState
  }

  allDocCount = () => {
    const { items = [] } = this.props
    return _.max(R.map(R.prop("doc_count"), items))
  }

  selectAllHandler = (event: Event) => {
    const { items = [], setItems } = this.props

    if (event.target.checked) {
      this.setState({ allOptionClass: "is-active" })
      setItems(items.map(item => item.key))
    } else {
      this.setState(selectAllInitialState)
      setItems([])
    }
  }

  itemComponentList = () => {
    const {
      countFormatter,
      items = [],
      multiselect,
      setItems,
      toggleItem,
      translate
    } = this.props
    const toggleFunc = multiselect ? toggleItem : key => setItems([key])

    return _.map(items, option => {
      const label = option.title || option.label || option.key
      const props = {
        label:   translate(label),
        onClick: () => toggleFunc(option.key),
        key:     option.key,
        count:   countFormatter(option.doc_count),
        active:  this.isActive(option)
      }
      return <CheckboxItem {...props} />
    })
  }

  allAction = (countFormatter: Function) => (
    <div
      className={`sk-item-list-option sk-item-list__item ${this.state
        .allOptionClass}`}
      key="select-all-items"
    >
      <input
        type="checkbox"
        data-qa="checkbox"
        onChange={this.selectAllHandler}
        className="sk-item-list-option checkbox"
      />
      <div className="sk-item-list-option__text">Select All</div>
      <div className="sk-item-list-option__count">
        {countFormatter(this.allDocCount())}
      </div>
    </div>
  )

  render() {
    const { mod, countFormatter, disabled, className } = this.props

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
        {[this.allAction(countFormatter), ...this.itemComponentList()]}
      </div>
    )
  }
}

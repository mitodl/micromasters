// @flow
/* global event: false */
import _ from "lodash"
import * as React from "react"
import { AbstractItemList, block } from "searchkit"

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
    const countList = []
    for (const item of items) {
      countList.push(item.doc_count)
    }
    return _.max(countList) || 0
  }

  selectAllHandler = (event: Event) => {
    const { items = [], setItems } = this.props
    const keys = []
    if (event.target.checked) {
      this.setState({ allOptionClass: "is-active" })
      for (const item of items) {
        keys.push(item.key)
      }
    } else {
      this.setState(selectAllInitialState)
    }
    setItems(keys)
  }

  render() {
    const {
      mod,
      items = [],
      translate,
      toggleItem,
      setItems,
      multiselect,
      countFormatter,
      disabled,
      className
    } = this.props

    const bemBlocks = {
      container: block(mod).el,
      option:    block(`${mod}-option`).el
    }

    const toggleFunc = multiselect ? toggleItem : key => setItems([key])
    const allAction = (
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
    const itemComponentList = _.map(items, option => {
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

    const actions = [allAction, ...itemComponentList]
    return (
      <div
        data-qa="options"
        className={bemBlocks
          .container()
          .mix(className)
          .state({ disabled })}
      >
        {actions}
      </div>
    )
  }
}

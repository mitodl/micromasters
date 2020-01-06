// @flow
import React from "react"
import Icon from "@material-ui/core/Icon"
import type { Event, EventTarget } from "../../flow/eventType"

export default class CustomPaginationDisplay extends React.Component {
  props: {
    disabled: boolean,
    toggleItem: Function
  }

  onClick(toggleItem: Function, evt: Event): void {
    evt.preventDefault()
    const target: EventTarget = evt.target
    const key = target.getAttribute("data-key")
    toggleItem(key)
  }

  render() {
    const { toggleItem, disabled } = this.props
    let optionsNext, optionsPrev

    if (!disabled) {
      optionsPrev = (
        <div
          className="sk-toggle-option sk-toggle__item sk-pagination-option"
          data-qa="option"
          data-key="previous"
          onClick={this.onClick.bind(null, toggleItem)}
        >
          <Icon data-key="previous">navigate_before</Icon>
        </div>
      )
      optionsNext = (
        <div
          className="sk-toggle-option sk-toggle__item sk-pagination-option"
          data-qa="option"
          data-key="next"
          onClick={this.onClick.bind(null, toggleItem)}
        >
          <Icon data-key="next">navigate_next</Icon>
        </div>
      )
    }

    return (
      <div data-qa="options" className="sk-toggle sk-toggle-height">
        {optionsPrev}
        {optionsNext}
      </div>
    )
  }
}

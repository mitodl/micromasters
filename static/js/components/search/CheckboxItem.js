// @flow
import React from "react"

const optionClassName = "sk-item-list-option"

export default class CheckboxItem extends React.Component {
  props: {
    label: string,
    active: boolean,
    onClick: Function,
    count: number
  }

  render() {
    const { active, onClick, count, label } = this.props
    const activeClass = active ? "is-active" : ""
    return (
      <div
        className={`${optionClassName} sk-item-list__item ${activeClass}`}
        onClick={onClick}
      >
        <input
          type="checkbox"
          data-qa="checkbox"
          checked={active}
          readOnly
          className={`${optionClassName} checkbox`}
        />
        <div className={`${optionClassName}__text facet-text`}>
          {label || "N/A"}
        </div>
        <div className={`${optionClassName}__count`}>{count}</div>
      </div>
    )
  }
}

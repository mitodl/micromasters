// @flow
import React from "react"
import R from "ramda"

import { codeToCountryName } from "../../lib/location"

export default class CountryRefinementOption extends React.Component {
  props: {
    label: string,
    active: boolean,
    onClick: Function,
    count: number
  }

  render() {
    const { active, onClick, count, label } = this.props
    const activeClass = () => (active ? "is-active" : "")
    const option = "sk-item-list-option"
    return (
      <div
        className={`${option} sk-item-list__item ${activeClass()}`}
        onClick={onClick}
      >
        <input
          type="checkbox"
          data-qa="checkbox"
          checked={active}
          readOnly
          className={`${option} checkbox`}
        />
        <div className={`${option}__text`}>
          {R.when(R.equals(""), () => "N/A", codeToCountryName(label))}
        </div>
        <div className={`${option}__count`}>{count}</div>
      </div>
    )
  }
}

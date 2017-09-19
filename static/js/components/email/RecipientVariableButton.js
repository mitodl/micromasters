// @flow
import React from "react"

export default class RecipientVariableButton extends React.Component {
  props: {
    onClick: Function,
    value: string
  }

  render() {
    const { onClick, value } = this.props
    return (
      <div
        className={`rdw-option-wrapper custom-toolbar-button button-${value}`}
        onClick={onClick}
      >
        {`[${value}]`}
      </div>
    )
  }
}

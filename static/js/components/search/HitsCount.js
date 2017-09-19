// @flow
import React from "react"

export default class HitsCount extends React.Component {
  props: {
    hitsCount: number
  }

  render() {
    const { hitsCount } = this.props
    return (
      <span>{`${hitsCount} ${hitsCount === 1 ? "Result" : "Results"}`}</span>
    )
  }
}

// @flow
import React from "react"

type Props = {
  hitsCount: number
}

export default class HitsCount extends React.Component<*, Props> {
  props: Props

  render() {
    const { hitsCount } = this.props
    return (
      <span>{`${hitsCount} ${hitsCount === 1 ? "Result" : "Results"}`}</span>
    )
  }
}

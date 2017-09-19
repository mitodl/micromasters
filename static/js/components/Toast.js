import React from "react"

import { wait } from "../util/util"

export default class Toast extends React.Component {
  props: {
    children: any,
    timeout: number,
    onTimeout: () => void
  }

  static defaultProps = {
    timeout: 5000
  }

  componentDidMount() {
    const { onTimeout, timeout } = this.props

    if (onTimeout) {
      wait(timeout).then(onTimeout)
    }
  }

  render() {
    const { children } = this.props

    return (
      <div role="alert" className="toast">
        {children}
      </div>
    )
  }
}

import React from "react"

import { wait } from "../util/util"

type Props = {
  children: any,
  timeout: number,
  onTimeout: () => void
}

export default class Toast extends React.Component<*, Props> {
  props: Props

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

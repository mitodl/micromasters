// @flow
import React from "react"
import Spinner from "react-mdl/lib/Spinner"

export default class Loader extends React.Component {
  props: {
    loaded: boolean,
    children?: React$Element<*>[],
    shouldRenderAll?: boolean
  }

  renderAll = (loaded: boolean, children?: React$Element<*>[]) => [
    <div
      className="loader"
      style={{ display: !loaded ? "block" : "none" }}
      key="loader"
    >
      <Spinner singleColor />
    </div>,
    <div style={{ display: loaded ? "block" : "none" }} key="content">
      {children}
    </div>
  ]

  renderLoadedOrSpinner = (loaded: boolean, children?: React$Element<*>[]) =>
    loaded ? (
      children
    ) : (
      <div className="loader">
        {" "}
        <Spinner singleColor />{" "}
      </div>
    )

  render() {
    const { loaded, children, shouldRenderAll = false } = this.props
    return (
      <div>
        {shouldRenderAll
          ? this.renderAll(loaded, children)
          : this.renderLoadedOrSpinner(loaded, children)}
      </div>
    )
  }
}

// @flow
import React, { Component } from "react"
import PropTypes from "prop-types"
import Paper from "@material-ui/core/Paper"

function getStyles(props, context, state) {
  const { open } = state
  const { muiTheme } = context

  return {
    root: {
      opacity:    open ? 1 : 0,
      transition: 0,
      position:   "fixed",
      zIndex:     muiTheme.zIndex.popover,
      maxHeight:  "100%"
    }
  }
}

export default class PopoverNullAnimation extends Component {
  static propTypes = {
    children:     PropTypes.node,
    className:    PropTypes.string,
    open:         PropTypes.bool.isRequired,
    /**
     * Override the inline-styles of the root element.
     */
    style:        PropTypes.object,
    targetOrigin: PropTypes.string.isRequired,
    zDepth:       PropTypes.number
  }

  static defaultProps = {
    style:  {},
    zDepth: 1
  }

  static contextTypes = {
    muiTheme: PropTypes.object.isRequired
  }

  state = {
    open: false
  }

  componentDidMount() {
    this.setState({ open: true }) // eslint-disable-line react/no-did-mount-set-state
  }

  getDerivedStateFromProps(nextProps: any) {
    this.setState({
      open: nextProps.open
    })
  }

  render() {
    const { className, style, zDepth } = this.props

    const styles = getStyles(this.props, this.context, this.state)

    return (
      <Paper
        style={{ ...styles.root, style }}
        zDepth={zDepth}
        className={className}
      >
        {this.props.children}
      </Paper>
    )
  }
}

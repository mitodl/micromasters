import React from "react"
import CircularProgress from "@material-ui/core/CircularProgress"

type SpinnerButtonProps = {
  spinning: boolean,
  component: React.Component<*, *, *>,
  className?: string,
  onClick?: Function,
  children?: any,
  disabled?: ?boolean,
  ignoreRecentlyClicked: ?boolean
}

export default class SpinnerButton extends React.Component {
  props: SpinnerButtonProps

  constructor(props) {
    super(props)
    this.state = {
      // This keeps track of if a button was recently clicked, to indicate
      // that props.spinning is relevant to this button. If a button was not
      // clicked but spinning=true, it will be ignored.
      recentlyClicked: false
    }
  }

  // eslint-disable-next-line
  UNSAFE_componentWillReceiveProps(nextProps: SpinnerButtonProps) {
    if (!nextProps.spinning && this.props.spinning) {
      // spinning has finished, so reset the state
      this.setState({
        recentlyClicked: false
      })
    }
  }

  isDisabled = () => this.props.disabled || this.props.spinning || undefined

  // If button is not disabled and has an onClick handler, make sure to set recentlyClicked
  // so we display the spinner
  onClick = (...args) => {
    this.setState({
      recentlyClicked: true
    })
    return this.props.onClick(...args)
  }

  render() {
    /* eslint-disable prefer-const */
    let {
      component: ComponentVariable,
      spinning,
      className,
      children,
      disabled,
      ignoreRecentlyClicked,
      ...otherProps
    } = this.props
    /* eslint-enable prefer-const */
    const { recentlyClicked } = this.state

    if (spinning && !disabled && (ignoreRecentlyClicked || recentlyClicked)) {
      if (!className) {
        className = ""
      }
      className = `${className} disabled-with-spinner`
      children = <CircularProgress />
    }

    return (
      <ComponentVariable
        className={className}
        disabled={this.isDisabled()}
        {...otherProps}
        onClick={this.isDisabled() ? undefined : this.onClick}
      >
        {children}
      </ComponentVariable>
    )
  }
}

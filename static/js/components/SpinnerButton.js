import React from "react"
import Spinner from "react-mdl/lib/Spinner"

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

  static getDerivedStateFromProps(nextProps: SpinnerButtonProps, prevState) {
    if (!nextProps.spinning && prevState.spinning) {
      // spinning has finished, so reset the state
      return {
        recentlyClicked: false
      }
    }
    return null
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
      children = <Spinner singleColor />
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

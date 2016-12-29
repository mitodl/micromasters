import React from 'react';
import Spinner from 'react-mdl/lib/Spinner';

type SpinnerButtonProps = {
  spinning: bool,
  component: React.Component<*, *, *>,
  className?: string,
  onClick?: Function,
  children?: any,
  disabled?: ?bool,
};

export default class SpinnerButton extends React.Component {
  props: SpinnerButtonProps;

  constructor(props) {
    super(props);
    this.state = {
      // This keeps track of if a button was recently clicked, to indicate
      // that props.spinning is relevant to this button. If a button was not
      // clicked but spinning=true, it will be ignored.
      recentlyClicked: false
    };
  }

  componentWillReceiveProps(nextProps: SpinnerButtonProps) {
    if (!nextProps.spinning && this.props.spinning) {
      // spinning has finished, so reset the state
      this.setState({
        recentlyClicked: false
      });
    }
  }

  render() {
    let {
      component: ComponentVariable,
      spinning,
      className,
      onClick,
      children,
      disabled,
      ...otherProps
    } = this.props;
    const { recentlyClicked } = this.state;

    if (spinning && !disabled) {
      if (recentlyClicked) {
        if (!className) {
          className = '';
        }
        className = `${className} disabled-with-spinner`;
        children = <Spinner singleColor/>;
      }
      disabled = true;
    }
    if (disabled) {
      onClick = undefined;
    }

    if (onClick) {
      let oldOnClick = onClick;
      onClick = (...args) => {
        this.setState({
          recentlyClicked: true
        });
        return oldOnClick(...args);
      };
    }

    return <ComponentVariable
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...otherProps}
    >
      {children}
    </ComponentVariable>;
  }
}

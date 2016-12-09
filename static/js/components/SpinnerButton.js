import React from 'react';
import Spinner from 'react-mdl/lib/Spinner';

export default class SpinnerButton extends React.Component {
  props: {
    spinning: bool,
    component: React.Component<*, *, *>,
    className?: string,
    onClick?: Function,
    children?: any,
    disabled?: ?bool,
  };

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

    if (spinning) {
      if (!className) {
        className = '';
      }
      className = `${className} disabled-with-spinner`;
      onClick = undefined;
      children = <Spinner singleColor />;
      disabled = true;
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
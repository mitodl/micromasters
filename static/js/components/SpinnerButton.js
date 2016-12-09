import React from 'react';
import Spinner from 'react-mdl/lib/Spinner';

export default class SpinnerButton extends React.Component {
  props: {
    spinning: bool,
    component: React.Component<*, *, *>,
    className?: string,
    onClick?: Function,
    children?: any,
  };

  render() {
    let {
      component: ComponentVariable,
      spinning,
      className,
      onClick,
      children,
      ...otherProps
    } = this.props;

    if (spinning) {
      if (!className) {
        className = '';
      }
      className = `${className} disabled-with-spinner`;
      onClick = undefined;
      children = <Spinner singleColor />;
    }

    return <ComponentVariable
      className={className}
      onClick={onClick}
      {...otherProps}
    >
      {children}
    </ComponentVariable>;
  }
}
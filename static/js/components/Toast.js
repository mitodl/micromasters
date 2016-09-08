// @flow
import React from 'react';

export default class Toast extends React.Component {
  props: {
    open: boolean,
    children: React.Element<*>,
    timeout: number,
    onTimeout: () => void,
  };

  static defaultProps = {
    timeout: 5000
  };

  componentDidMount() {
    const { onTimeout, open, timeout } = this.props;

    if (open && onTimeout) {
      setTimeout(onTimeout, timeout);
    }
  }

  componentDidUpdate(prevProps) {
    const { onTimeout, timeout } = this.props;
    if (!prevProps.open && this.props.open && onTimeout) {
      setTimeout(onTimeout, timeout);
    }
  }

  render() {
    const { children, open } = this.props;

    return <div className={`toast ${open ? 'open' : ''}`}>
      {children}
    </div>;
  }
}

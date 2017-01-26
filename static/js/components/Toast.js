import React from 'react';

export default class Toast extends React.Component {
  props: {
    children: any,
    timeout: number,
    onTimeout: () => void,
  };

  static defaultProps = {
    timeout: 5000
  };

  componentDidMount() {
    const { onTimeout, timeout } = this.props;

    if (onTimeout) {
      setTimeout(onTimeout, timeout);
    }
  }

  render() {
    const { children } = this.props;

    return <div role="alert" className="toast">
      {children}
    </div>;
  }
}

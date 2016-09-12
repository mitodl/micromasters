import React from 'react';

export default class Toast extends React.Component {
  props: {
    children: any,
    open: boolean,
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

  componentDidUpdate(prevProps: Object) {
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

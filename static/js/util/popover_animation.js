// @flow
import React, { Component, PropTypes } from 'react';
import Paper from 'material-ui/Paper';
import propTypes from 'material-ui/utils/propTypes';


function getStyles(props, context, state) {
  const {open} = state;
  const {muiTheme} = context;

  return {
    root: {
      opacity: open ? 1 : 0,
      transition: 0,
      position: 'fixed',
      zIndex: muiTheme.zIndex.popover,
      maxHeight: '100%',
    },
  };
}


export default class PopoverNullAnimation extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    open: PropTypes.bool.isRequired,
    /**
     * Override the inline-styles of the root element.
     */
    style: PropTypes.object,
    targetOrigin: propTypes.origin.isRequired,
    zDepth: propTypes.zDepth,
  };

  static defaultProps = {
    style: {},
    zDepth: 1,
  };

  static contextTypes = {
    muiTheme: PropTypes.object.isRequired,
  };

  state = {
    open: false,
  };

  componentDidMount() {
    this.setState({open: true}); // eslint-disable-line react/no-did-mount-set-state
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      open: nextProps.open,
    });
  }

  render() {
    const {
      className,
      style,
      zDepth,
    } = this.props;

    const styles = getStyles(this.props, this.context, this.state);

    return (
      <Paper
        style={Object.assign(styles.root, style)}
        zDepth={zDepth}
        className={className}
      >
        {this.props.children}
      </Paper>
    );
  }
}

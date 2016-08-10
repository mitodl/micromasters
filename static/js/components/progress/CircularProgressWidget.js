// @flow
import React from 'react';

export default class CircularProgressWidget extends React.Component {

  static propTypes = {
    radius:       React.PropTypes.number,
    strokeWidth:  React.PropTypes.number,
    actual:       React.PropTypes.number,
    total:        React.PropTypes.number
  };

  static defaultProps = {
    radius:      80,
    actual:      0,
    total:       100,
    strokeWidth: 9
  };

  render() {
    const { radius, strokeWidth, actual, total } = this.props;

    const radiusForMeasures = radius - strokeWidth / 2;
    const width = radius * 2;
    const height = radius * 2;
    const viewBox = `0 0 ${width} ${height}`;
    const dashArray = radiusForMeasures * Math.PI * 2;
    const dashOffset = dashArray - dashArray * actual / total;

    return (
      <svg className="circular-progress-widget"
        width={radius * 2}
        height={radius * 2}
        viewBox={viewBox}>
        <circle
          className="circular-progress-widget-bg"
          cx={radius}
          cy={radius}
          r={radiusForMeasures}
          strokeWidth={`${strokeWidth}px`} />
        <circle
          className="circular-progress-widget-fg"
          cx={radius}
          cy={radius}
          r={radiusForMeasures}
          strokeWidth={`${strokeWidth}px`}
          style={{
            strokeDasharray: dashArray,
            strokeDashoffset: dashOffset
          }} />
        <text
          className="circular-progress-widget-txt"
          x={radius}
          y={radius}
          dy=".4em"
          textAnchor="middle">
          {`${actual}/${total}`}
        </text>
      </svg>
    );
  }
}

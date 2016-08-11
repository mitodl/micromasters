// @flow
import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';

export default class ProgressWidget extends React.Component {
  props: {
    actual: number,
    total:  number
  };

  // this is temporary, we can remove it once it is integrate into learners dashboard
  static defaultProps = {
    actual: 3,
    total:  5
  };

  circularProgressWidget: Function = (
    radius: number,
    strokeWidth: number,
    actual: number,
    total: number
  ): React$Element<*> => {
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

  render() {
    const { actual, total } = this.props;

    return (
      <div className="progress-widget">
        <p className="text heading-text">Progress</p>
        <div className="circular-progress-widget">
          {this.circularProgressWidget(80, 9, actual, total)}
        </div>
        <p className="text text-course-complete">Courses complete</p>
        <p className="text heading-paragraph">
          On completion, you can apply for <br/>
          the Masters Degree Program</p>
        <div className="apply-master-btn">
           <RaisedButton
             disabledBackgroundColor="#8ee0b0"
             disabledLabelColor="#25b346"
             label="Apply for Masters"
             disabled={true} />
        </div>
      </div>
    );
  }
}

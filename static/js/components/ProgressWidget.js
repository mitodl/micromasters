// @flow
import React from 'react';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import Button from 'react-mdl/lib/Button';

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
  };

  render() {
    const { actual, total } = this.props;

    return (
      <Card className="progress-widget" shadow={0}>
        <CardTitle className="progress-title">Progress</CardTitle>
        <div className="circular-progress-widget">
          {this.circularProgressWidget(63, 7, actual, total)}
        </div>
        <p className="text-course-complete">Courses complete</p>
        <p className="heading-paragraph">
          On completion, you can apply for <br/>
          the Masters Degree Program</p>
        <div className="apply-master-btn">
           <Button disabled className="progress-button">
             Apply for Masters
           </Button>
        </div>
      </Card>
    );
  }
}

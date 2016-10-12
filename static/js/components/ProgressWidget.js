// @flow
import React from 'react';
import { Card, CardTitle } from 'react-mdl/lib/Card';
import Button from 'react-mdl/lib/Button';

import type {
  Program
} from '../flow/programTypes';
import { programCourseInfo } from '../util/util';

export default class ProgressWidget extends React.Component {
  props: {
    program: Program
  };

  circularProgressWidget: Function = (
    radius: number,
    strokeWidth: number,
    totalPassedCourses: number,
    totalCourses: number
  ): React$Element<*> => {
    const radiusForMeasures = radius - strokeWidth / 2;
    const width = radius * 2.5;
    const height = radius * 2.5;
    const viewBox = `-13 -13 ${width} ${height}`;
    const dashArray = radiusForMeasures * Math.PI * 2;
    const dashOffset = dashArray - dashArray * totalPassedCourses / (totalCourses || 1);

    return (
      <svg
        width={radius * 2.5}
        height={radius * 2.5}
        viewBox={viewBox}>
        <path d="M -3 65 h 2 -10" stroke="white" strokeWidth="2" />
        <path d="M 40 2 l -3 -7" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 24 11 l -4 -6" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 11 22 l -4 -5" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 4 34 l -6 -5" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 0 49 l -9 -2" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 58 -3 v 2 -9" stroke="white" strokeWidth="2"  />
        <path d="M 75 2 l 3 -7" stroke="white" strokeWidth="1" className="dashed-circle"/>
        <path d="M 90 8 l 5 -7" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 104 19 l 6 -6" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 114 32 l 8 -4" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 120 50 l 8 -2" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 120 65 h 8 2" stroke="white" strokeWidth="2"  />
        <path d="M 117 80 l 8 2" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 111 94 l 8 3" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 103 104 l 6 6" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 90 114 l 3 8" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 75 120 l 2 9" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 58 128 v 2 -9" stroke="white" strokeWidth="2"  />
        <path d="M 43 128 l 2 -10" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 26 123 l 5 -10" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 12 113 l 7 -7" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M 2 100 l 8 -6" stroke="white" strokeWidth="1" className="dashed-circle" />
        <path d="M -5 86 l 8 -4" stroke="white" strokeWidth="1" className="dashed-circle" />

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
          {`${totalPassedCourses}/${totalCourses}`}
        </text>
      </svg>
    );
  };

  render() {
    const { program } = this.props;
    const { totalPassedCourses, totalCourses } = programCourseInfo(program);

    return (
      <Card className="progress-widget" shadow={0}>
        <CardTitle className="progress-title">Progress</CardTitle>
        <div className="circular-progress-widget">
          {this.circularProgressWidget(60, 6, totalPassedCourses, totalCourses)}
        </div>
        <p className="text-course-complete">Courses complete</p>
        <p className="heading-paragraph">
          On completion, you can apply for
          the Masters Degree Program</p>
        <div className="apply-master-btn">
           <Button className="progress-button disabled">
             Apply for Masters
           </Button>
        </div>
      </Card>
    );
  }
}

// @flow
import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';

export default class CircularProgressWidget extends React.Component {

    render() {
        const radius = this.props.radius - this.props.strokeWidth / 2;
        const width = this.props.radius * 2;
        const height = this.props.radius * 2;
        const viewBox = `0 0 ${width} ${height}`;
        const dashArray = radius * Math.PI * 2;
        const dashOffset = dashArray - dashArray * this.props.actual / this.props.total;

        return (
            <svg className="circular-progress-widget"
                width={this.props.radius * 2}
                height={this.props.radius * 2}
                viewBox={viewBox}>
                <circle
                    className="circular-progress-widget-bg"
                    cx={this.props.radius}
                    cy={this.props.radius}
                    r={radius}
                    strokeWidth={`${this.props.strokeWidth}px`} />
                <circle
                    className="circular-progress-widget-fg"
                    cx={this.props.radius}
                    cy={this.props.radius}
                    r={radius}
                    strokeWidth={`${this.props.strokeWidth}px`}
                    style={{
                        strokeDasharray: dashArray,
                        strokeDashoffset: dashOffset
                    }} />
                <text
                    className="circular-progress-widget-txt"
                    x={this.props.radius}
                    y={this.props.radius}
                    dy=".4em"
                    textAnchor="middle">
                    {`${this.props.actual}/${this.props.total}`}
                </text>
            </svg>
        );
    }
}

CircularProgressWidget.defaultProps = {
    radius: 80,
    actual: 50,
    total: 100,
    strokeWidth: 9
};

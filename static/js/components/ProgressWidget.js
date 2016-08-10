// @flow
import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';

import CircularProgressWidget from './progress/CircularProgressWidget';

export default class ProgressWidget extends React.Component {

  static propTypes = {
    actual:       React.PropTypes.number,
    total:        React.PropTypes.number,
    disabled:     React.PropTypes.bool
  };

  // this is temporary, we can remove it once it is integrate into learners dashboard
  static defaultProps = {
    actual:      3,
    total:       5,
  };

  render() {
    let applyForMSBtnLabel = 'Apply for Masters';
    const { actual, total } = this.props;

    return (
      <div className="progress-widget">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <p className="pull-left text heading-text">Progress</p>
              <div className="row center-block">
                <div className="col-md-12">
                  <div className="circular-progress-widget">
                      <CircularProgressWidget actual={actual} total={total} />
                  </div>
                  <p className="text text-course-complete text-center">Courses complete</p>
                  <p className="text heading-paragraph text-center">
                    On completion, you can apply for <br/>
                    the Masters Degress Program</p>
                  <div className="apply-master-btn">
                     <RaisedButton
                       disabledBackgroundColor="#8ee0b0"
                       disabledLabelColor="#25b346"
                       label={applyForMSBtnLabel}
                       disabled={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

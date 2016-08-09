// @flow
import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';

import CircularProgressWidget from './progress/CircularProgressWidget';

export default class ProgressWidget extends React.Component {
    render() {
        let applyForMSBtnLabel = 'Apply for Masters';

        return (
            <div className="progress-widget">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12">
                            <p className="pull-left text heading-text">Progress</p>
                            <div className="row center-block">
                                <div className="col-md-12">
                                    <div className="circular-progress-widget">
                                        <CircularProgressWidget
                                            actual={2}
                                            total={5} />
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
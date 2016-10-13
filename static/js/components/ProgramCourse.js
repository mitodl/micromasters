// @flow
import React from 'react';
import Popover from 'material-ui/Popover';


export default class ProgramCourse extends React.Component {
  props: {
    id: number,
    title: string,
    description: string,
    url: string,
    enrollment_text: string,
  }
  state = {
    isOpen: false,
  }
  handleClick = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      isOpen: true,
      anchorEl: event.currentTarget,
    });
  }
  handleRequestClose = () => {
    this.setState({
      isOpen: false,
    });
  }
  render() {
    const {
      title,
      description,
      url,
      enrollment_text: enrollmentText
    } = this.props;
    const {
      isOpen,
      anchorEl
    } = this.state;

    let titleEl, popoverLink;
    if (url) {
      titleEl = <a href={url}>{title}</a>;
      popoverLink = <a className="edx-link" href={url}>View on edX</a>;
    } else {
      titleEl = title;
      popoverLink = null;
    }
    return (
      <li>
        <h4 className="title" onClick={this.handleClick}>
          {titleEl}
        </h4>
        <Popover
          className="program-course-popover mdl-cell mdl-cell--4-col"
          open={isOpen}
          anchorEl={anchorEl}
          anchorOrigin={{horizontal: 'left', vertical: 'top'}}
          targetOrigin={{horizontal: 'center', vertical: 'bottom'}}
          onRequestClose={this.handleRequestClose}
        >
          <h4 className="title">{title}</h4>
          <div className="description course-description">{description}</div>
          {popoverLink}
        </Popover>
        <div className="description enrollment-dates">
          {enrollmentText}
        </div>
      </li>
    );
  }
}

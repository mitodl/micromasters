// @flow
import React from "react"
import Popover from "@material-ui/core/Popover"

import PopoverNullAnimation from "../util/popover_animation"
import type { ProgramPageCourse } from "../flow/programTypes"

const popoverLink = url =>
  url ? (
    <a className="edx-link" href={url}>
      View on edX
    </a>
  ) : null

export default class CourseListItemWithPopover extends React.Component {
  props: {
    course: ProgramPageCourse
  }

  state = {
    isOpen:   false,
    anchorEl: undefined
  }

  handleClick = (event: Event) => {
    // This prevents ghost click.
    event.preventDefault()

    this.setState({
      isOpen:   true,
      anchorEl: event.currentTarget
    })
  }

  handleRequestClose = () => {
    this.setState({
      isOpen: false
    })
  }

  render() {
    const {
      course: { title, description, url, enrollment_text: enrollmentText }
    } = this.props
    const { isOpen, anchorEl } = this.state

    // if there is no description, set a default
    const descriptionText = description || "No description available."

    // We want to disable animations for the Popover component, and the
    // documentation *says* that you can pass `animated={false}` to do so.
    // However, it appears that the documentation is full of lies, or the
    // Popover component is full of bugs, or both. Setting `animated={false}`
    // appears to do nothing at all to change the behavior.
    //
    // As a workaround, we've implemented a custom animation component called
    // PopoverNullAnimation, which does nothing. More specifically, it causes
    // the popover to appear and disappear, without any fancy fading, sliding,
    // expanding, transitioning, rotating, flipping, or invading the lawns
    // of the local elderly population. If the `animated={false}` thing ever
    // mysteriously starts working, this PopoverNullAnimation can be removed,
    // but the current situation requires passing this component to make
    // sure that the popover gets off our lawn.
    return (
      <li className="program-course">
        <h4 className="course-row" onClick={this.handleClick}>
          {title}
        </h4>

        <Popover
          classes={{ paper: "program-course-popover" }}
          open={isOpen}
          anchorEl={anchorEl}
          animated={false}
          animation={PopoverNullAnimation}
          anchorOrigin={{ horizontal: "left", vertical: "top" }}
          transformOrigin={{ horizontal: "middle", vertical: "bottom" }}
          onClose={this.handleRequestClose}
        >
          <h4 className="title">{title}</h4>
          <div
            className="description course-description"
            dangerouslySetInnerHTML={{ __html: descriptionText }}
          />
          {popoverLink(url)}
        </Popover>
        <div className="description enrollment-dates">{enrollmentText}</div>
      </li>
    )
  }
}

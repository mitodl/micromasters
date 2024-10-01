/* global SETTINGS:false */
import React from "react"
import { connect } from "react-redux"
import Dialog from "@material-ui/core/Dialog"
import R from "ramda"
import Select from "@material-ui/core/Select"
import DialogTitle from "@material-ui/core/DialogTitle"
import MenuItem from "@material-ui/core/MenuItem"
import DialogContent from "@material-ui/core/DialogContent"
import FormControl from "@material-ui/core/FormControl"
import InputLabel from "@material-ui/core/InputLabel"
import DialogContentText from "@material-ui/core/DialogContentText"
import DialogActions from "@material-ui/core/DialogActions"

import { createSimpleActionHelpers } from "../lib/redux"
import {
  setSendDialogVisibility,
  sendGradeEmail,
  setSelectedSchool
} from "../actions/send_grades_dialog"

const getMenuItem = (key: number, value: string): React$Element<*> => (
  <MenuItem value={key} classes={{ root: "menu-item" }} key={key}>
    {value}
  </MenuItem>
)

class SendGradesDialog extends React.Component {
  props: {
    open: boolean,
    selectedSchool: ?number,
    setSelectedSchool: (schoolId: number) => void,
    setSendDialogVisibility: (b: boolean) => void,
    sendGradeEmailClick: (f: Array<*>) => void,
    sentSuccess: boolean
  }
  handleSelectedSchoolChange = event => {
    const { setSelectedSchool } = this.props
    setSelectedSchool(event.target.value)
  }

  render() {
    const {
      open,
      setSendDialogVisibility,
      sendGradeEmailClick,
      selectedSchool,
      sentSuccess
    } = this.props

    const options = []
    R.forEach(
      school =>
        school[1] === "MIT"
          ? options.unshift(getMenuItem(school[0], school[1]))
          : options.push(getMenuItem(school[0], school[1])),
      SETTINGS.partner_schools
    )

    return (
      <Dialog
        classes={{ paper: "dialog send-dialog" }}
        open={open}
        onClose={() => {
          setSendDialogVisibility(false)
        }}
      >
        <DialogTitle className="dialog-title">
          Send Record to Partner
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You can directly share your program record with partners that accept
            credit for this MicroMasters Program. Once you send the record you
            cannot unsend it.
          </DialogContentText>
          <DialogContentText>
            Select organization(s) you wish to send this record to:
          </DialogContentText>

          <FormControl className="select-control">
            <InputLabel>Select School</InputLabel>
            <Select
              value={selectedSchool || ""}
              onChange={this.handleSelectedSchoolChange}
              style={{
                width: "500px"
              }}
            >
              {options}
            </Select>
          </FormControl>

          <DialogActions>
            <div className="sent-email">{sentSuccess ? "Email Sent!" : ""}</div>
            <button
              className="btn pull-right close-send-dialog"
              onClick={() => {
                setSendDialogVisibility(false)
              }}
            >
              Close
            </button>
            <button
              className="btn btn-primary pull-right send-grades"
              onClick={() => {
                selectedSchool
                  ? sendGradeEmailClick([selectedSchool, SETTINGS.hash])
                  : null
              }}
            >
              Send
            </button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    )
  }
}
const sendGradeEmailClick = R.curry((dispatch, data) => {
  dispatch(sendGradeEmail(data))
})

const setSelectedSchoolDispatch = R.curry((dispatch, schoolId) => {
  dispatch(setSelectedSchool(schoolId))
})

const mapStateToProps = state => ({
  open:           state.sendDialog.sendDialogVisibility,
  sentSuccess:    state.sendDialog.sentSuccess,
  selectedSchool: state.sendDialog.selectedSchool
})

const mapDispatchToProps = dispatch => {
  return {
    sendGradeEmailClick: sendGradeEmailClick(dispatch),
    setSelectedSchool:   setSelectedSchoolDispatch(dispatch),
    ...createSimpleActionHelpers(dispatch, [
      ["setSendDialogVisibility", setSendDialogVisibility]
    ])
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SendGradesDialog)

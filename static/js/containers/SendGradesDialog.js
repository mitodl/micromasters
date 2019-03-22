/* global SETTINGS:false */
import React from "react"
import { createSimpleActionHelpers } from "../lib/redux"
import {
  setSendDialogVisibility,
  sendGradeEmail,
  setSelectedSchool
} from "../actions/send_grades_dialog"
import { connect } from "react-redux"
import Dialog from "material-ui/Dialog"
import R from "ramda"
import SelectField from "material-ui/SelectField"
import MenuItem from "material-ui/MenuItem"

class SendGradesDialog extends React.Component {
  props: {
    open: boolean,
    selectedSchool: ?number,
    setSelectedSchool: (schoolId: number) => void,
    setSendDialogVisibility: (b: boolean) => void,
    sendGradeEmailClick: (f: Array<*>) => void,
    sentSuccess: boolean
  }
  handleSelectedSchoolChange = (event, index, value) => {
    const { setSelectedSchool } = this.props
    setSelectedSchool(value)
  }

  render() {
    const {
      open,
      setSendDialogVisibility,
      sendGradeEmailClick,
      selectedSchool,
      sentSuccess
    } = this.props
    const options = SETTINGS.partner_schools.map(program => (
      <MenuItem value={program[0]} primaryText={program[1]} key={program[0]} />
    ))
    return (
      <Dialog
        title="Send Record to Partner"
        titleClassName="dialog-title"
        contentClassName="dialog send-dialog"
        open={open}
        onRequestClose={() => {
          setSendDialogVisibility(false)
        }}
        autoScrollBodyContent={true}
      >
        <p>
          You can directly share your program record with partners that accept
          credit for this MicroMasters Program. Once you send the record you
          cannot unsend it.
        </p>
        <p>Select organization(s) you wish to send this record to:</p>
        <SelectField
          value={selectedSchool}
          onChange={this.handleSelectedSchoolChange}
          floatingLabelText="Select School"
          fullWidth={true}
          style={{
            width: "500px"
          }}
          menuStyle={{
            width:    "500px",
            overflow: "hidden"
          }}
        >
          {options}
        </SelectField>

        <div>
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
        </div>
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SendGradesDialog)

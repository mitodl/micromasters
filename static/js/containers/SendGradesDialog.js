/* global SETTINGS:false */
import React from "react"
import MenuItem from "material-ui/MenuItem"
import { createSimpleActionHelpers } from "../lib/redux"
import {
  setSendDialogVisibility,
  sendGradeEmail,
} from "../actions/send_grades_dialog"
import { connect } from "react-redux"
import Dialog from "material-ui/Dialog"
import type { Dispatch } from "redux"
import R from "ramda";
import SelectField from "../components/inputs/SelectField";
import type {Option} from "../flow/generalTypes";

class SendGradesDialog extends React.Component {
   partnerOptions: Array<Option> = SETTINGS.partner_schools.map(partner => ({
    value: partner[0],
    label: partner[1]
  }))
  props: {
    open: boolean,
    selectedSchool: ?number,
    setSendDialogVisibility: (b: boolean) => void,
    sendGradeEmailClick: (f: Array<*>) => void,
  }


  render() {
    const { open, setSendDialogVisibility, sendGradeEmailClick, selectedSchool } = this.props

    // const options = SETTINGS.partner_schools.map(school => (
    //   <MenuItem
    //     value={11}
    //     primaryText={"Harvard"}
    //     key={11}
    //   />
    // ))

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
          You can directly share your program record with partners that accept credit
          for this MicroMasters Program. Once you send the record you cannot unsend it.
        </p>
        <p>Select organization(s) you wish to send this record to:</p>

         <SelectField
          value=""
          floatingLabelText="Select Program"
          fullWidth={true}
          label="Industry"
          options={this.partnerOptions}
          style={{
            width: "500px"
          }}
          menuStyle={{
            width:    "500px",
            overflow: "hidden"
          }}
        >

        </SelectField>

        <div className="share-form-wrapper">
          <div>
            <button
              className="mdl-button share-btn"
              onClick={() => {setSendDialogVisibility(false)}}
            >
              Send
            </button>
            <button
              className="btn btn-primary pull-right"
              onClick={()=>{
                sendGradeEmailClick(["subject", "body", SETTINGS.username])}}>
              Send Email
            </button>


            </div>
        </div>
      </Dialog>
    )
  }

}
const sendGradeEmailClick = R.curry((dispatch, current) => {
  dispatch(sendGradeEmail(current)).then(() => {
  })
})

const mapStateToProps = state => ({
  open: state.sendDialog.sendDialogVisibility,
  sentSuccess: state.sendDialog.sentSuccess,
})

const mapDispatchToProps = dispatch => {
  return {
    sendGradeEmailClick: sendGradeEmailClick(dispatch),
    ...createSimpleActionHelpers(dispatch, [
      ["setSendDialogVisibility", setSendDialogVisibility],
    ])
  }

}

export default connect(mapStateToProps, mapDispatchToProps)(SendGradesDialog)

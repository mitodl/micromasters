import React from "react"
import { createSimpleActionHelpers } from "../lib/redux"
import {
  setSendDialogVisibility,
} from "../actions/send_grades_dialog"
import { connect } from "react-redux"
import Dialog from "material-ui/Dialog"

class SendGradesDialog extends React.Component {
  props: {
    open: boolean,
    setSendDialogVisibility: (b: boolean) => void,
  }


  render() {
    const { open, setSendDialogVisibility } = this.props
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
        <div className="share-form-wrapper">


            <div>
              <button
                className="mdl-button share-btn"
                onClick={() => {
          setSendDialogVisibility(false)
        }}
              >
                Send
              </button>

            </div>
        </div>
      </Dialog>
    )
  }
}

const mapStateToProps = state => ({
  open: state.sendDialog.sendDialogVisibility,
})

const mapDispatchToProps = dispatch =>
  createSimpleActionHelpers(dispatch, [
    ["setSendDialogVisibility", setSendDialogVisibility],
  ])

export default connect(mapStateToProps, mapDispatchToProps)(SendGradesDialog)

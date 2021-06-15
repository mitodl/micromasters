import React from "react"
import { createSimpleActionHelpers } from "../lib/redux"
import { setRevokeShareDialogVisibility } from "../actions/revoke_shared_records_dialog"
import { connect } from "react-redux"
import Dialog from "@material-ui/core/Dialog"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogContent from "@material-ui/core/DialogContent"
import DialogContentText from "@material-ui/core/DialogContentText"
import DialogActions from "@material-ui/core/DialogActions"

class RevokeShareDialog extends React.Component {
  props: {
    open: boolean,
    setRevokeShareDialogVisibility: (b: boolean) => void
  }

  render() {
    const { open, onAllowRevoke, setRevokeShareDialogVisibility } = this.props
    return (
      <Dialog
        classes={{ paper: "dialog revoke-share-dialog" }}
        open={open}
        onClose={() => {
          setRevokeShareDialogVisibility(false)
        }}
      >
        <DialogTitle className="dialog-title">Warning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Once revoked, all the previously shared records will be permanently
            invalidated and you have to re-share the records again.
          </DialogContentText>
          <DialogActions>
            <button
              className="btn pull-right close-send-dialog"
              onClick={() => {
                setRevokeShareDialogVisibility(false)
              }}
            >
              Close
            </button>
            <button
              className="btn btn-danger pull-right"
              onClick={() => {
                onAllowRevoke()
                setRevokeShareDialogVisibility(false)
              }}
            >
              I Agree
            </button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    )
  }
}

const mapStateToProps = state => ({
  open: state.revokeShareDialog.revokeShareDialogVisibility
})

const mapDispatchToProps = dispatch =>
  createSimpleActionHelpers(dispatch, [
    ["setRevokeShareDialogVisibility", setRevokeShareDialogVisibility]
  ])

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RevokeShareDialog)

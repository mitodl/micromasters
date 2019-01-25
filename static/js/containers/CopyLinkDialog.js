import React from "react"
import { createSimpleActionHelpers } from "../lib/redux"
import { setDialogVisibility } from "../actions/signup_dialog"
import { connect } from "react-redux"
import Dialog from "material-ui/Dialog"
import { dialogActions } from "../components/inputs/util"

const dialogStyle = {
  maxWidth: "500px"
}
class CopyLinkDialog extends React.Component {
  props: {
    open: boolean,
    setDialogVisibility: (b: boolean) => void
  }

  copyToClipboard = e => {
    this.textArea.select()
    document.execCommand("copy")
    e.target.focus()
  }

  render() {
    const { open, setDialogVisibility } = this.props
    return (
      <Dialog
        title="Share Link to Record"
        titleClassName="dialog-title"
        contentClassName="dialog share-dialog"
        className="signup-dialog-wrapper"
        open={open}
        onRequestClose={() => setDialogVisibility(false)}
        contentStyle={dialogStyle}
        autoScrollBodyContent={true}
      >
        <p>
          Copy this link to share with a university, employer or anyone else of
          you choosing. Anyone you share this link with will have access to your
          record forever.
        </p>
        <div className="share-form-wrapper">
          <form className="share-url">
            <textarea
              ref={textarea => (this.textArea = textarea)}
              value={window.location.href}
            />
          </form>
          {document.queryCommandSupported("copy") && (
            <div>
              <button
                className="mdl-button share-btn"
                onClick={this.copyToClipboard}
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </Dialog>
    )
  }
}

const mapStateToProps = state => ({
  open: state.shareDialog.dialogVisibility
})

const mapDispatchToProps = dispatch =>
  createSimpleActionHelpers(dispatch, [
    ["setDialogVisibility", setDialogVisibility]
  ])

export default connect(mapStateToProps, mapDispatchToProps)(CopyLinkDialog)

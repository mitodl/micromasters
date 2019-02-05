import React from "react"
import { createSimpleActionHelpers } from "../lib/redux"
import {
  setShareDialogVisibility,
  setCopySuccess
} from "../actions/share_grades_dialog"
import { connect } from "react-redux"
import Dialog from "material-ui/Dialog"

class CopyLinkDialog extends React.Component {
  props: {
    open: boolean,
    setShareDialogVisibility: (b: boolean) => void,
    setCopySuccess: (b: boolean) => void,
    copy: boolean
  }

  copyToClipboard = e => {
    const { setCopySuccess } = this.props
    this.input.select()
    document.execCommand("copy")
    e.target.focus()
    setCopySuccess(true)
  }

  render() {
    const { open, setShareDialogVisibility, setCopySuccess, copy } = this.props
    return (
      <Dialog
        title="Share Link to Record"
        titleClassName="dialog-title"
        contentClassName="dialog share-dialog"
        open={open}
        onRequestClose={() => {
          setShareDialogVisibility(false)
          setCopySuccess(false)
        }}
        autoScrollBodyContent={true}
      >
        <p>
          Copy this link to share with a university, employer or anyone else of
          you choosing. Anyone you share this link with will have access to your
          record forever.
        </p>
        <div className="share-form-wrapper">
          <form className="share-url">
            <input
              ref={input => (this.input = input)}
              readOnly={true}
              value={window.location.href}
            />
          </form>
          {document.queryCommandSupported("copy") && (
            <div>
              <button
                className="mdl-button share-btn"
                onClick={this.copyToClipboard}
              >
                Copy Link
              </button>
              <div className="copied-text">{copy && "Copied!"}</div>
            </div>
          )}
        </div>
      </Dialog>
    )
  }
}

const mapStateToProps = state => ({
  open: state.shareDialog.shareDialogVisibility,
  copy: state.shareDialog.copySuccess
})

const mapDispatchToProps = dispatch =>
  createSimpleActionHelpers(dispatch, [
    ["setShareDialogVisibility", setShareDialogVisibility],
    ["setCopySuccess", setCopySuccess]
  ])

export default connect(mapStateToProps, mapDispatchToProps)(CopyLinkDialog)

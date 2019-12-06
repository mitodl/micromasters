// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"
import IconButton from "@material-ui/core/IconButton"

const dialogTitle = setDialogVisibility => (
  <div className="title">
    <div className="text" key={1}>
      Income Verification Instructions
    </div>
    <IconButton
      name="close"
      className="close"
      onClick={() => setDialogVisibility(false)}
      key={2}
    />
  </div>
)

type DocsInstructions = {
  open: boolean,
  setDialogVisibility: (v: boolean) => void
}

const DocsInstructionsDialog = ({
  open,
  setDialogVisibility
  }: DocsInstructions) => (
  <Dialog
    title={dialogTitle(setDialogVisibility)}
    titleClassName="dialog-title"
    contentClassName="dialog docs-instructions-dialog"
    className="docs-instructions-dialog-wrapper"
    open={open}
    onRequestClose={() => setDialogVisibility(false)}
    autoScrollBodyContent={true}
  >
    <div className="heading">Whose income should I report?</div>
    <p>
      Report your taxable household income (the combined income of all people
      that are part of your household or place of residence). If you live with,
      or are financially supported by, your parent(s) or legal guardian(s)
      please enter their combined taxable income instead.
    </p>
    <div className="heading">
      What documents do you require to verify the income information I entered?
    </div>
    <p>
      Submit a signed photocopy of the most recent federal tax return of all
      income earners in your household as defined above.
    </p>
    <div className="heading">
      What if I am unable to provide you with a tax return?
    </div>
    <p>
      We will also accept a notarized income statement (i.e. a statement of
      annual salary, printed on the official letterhead of your employer,
      including the employer’s address and contact information, and signed by
      the employer). The income statement you submit must be signed by an
      authorized notary and contain an official seal/stamp and contact
      information. If your household income is based on more than one earner,
      you must submit notarized income statements for each earner.
    </p>
    <div className="heading">What if no one in my household is employed?</div>
    <p>
      Please submit either one of the following: a signed federal tax return
      (where you filed for zero income), a photocopy of an official receipt or
      check of unemployment benefits received, or a notarized letter verifying
      your unemployment status. If you cannot provide any of these documents,
      please submit a statement itemizing how your household supports itself on
      no income.
    </p>
    <div className="heading">
      What should I do if my financial documents are written in a language other
      than English?
    </div>
    <p>
      Please submit notarized income statements in English. If you are unable to
      provide documents in English, please submit a translation of the
      statement(s) along with the original, notarized income statement. If you
      are submitting a tax return in a language other than English, please
      submit a translation with the original tax return. We do not require the
      translation to be certified – you can translate the document yourself.
    </p>
  </Dialog>
)

export default DocsInstructionsDialog

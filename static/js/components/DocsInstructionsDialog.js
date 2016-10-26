// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Icon from 'react-mdl/lib/Icon';

const dialogTitle = setDialogVisibility => (
  <div className="docs-instructions-title">
    <div className="text" key={1}>
      Income Verification Instructions
    </div>
    <Icon name="close" onClick={() => setDialogVisibility(false)} key={2} />
  </div>
);

type DocsInstructions = {
  open:                 boolean,
  setDialogVisibility:  (v: boolean) => void,
};

const DocsInstructionsDialog = ({ open, setDialogVisibility }: DocsInstructions) => (
  <Dialog
    title={dialogTitle(setDialogVisibility)}
    titleClassName="dialog-title"
    contentClassName="dialog docs-instructions-dialog"
    className="docs-instructions-dialog-wrapper"
    open={open}
    onRequestClose={() => setDialogVisibility(false)}
    autoScrollBodyContent={true}
  >
    <div className="heading">
      Whose income should I report?
    </div>
    <p>
      Please report your own household income; that is, the combined income of all
      people that are part of your household or place of residence. If you live
      with, or are financially supported by your parent(s)/legal guardians, please
      enter their combined income instead. For example, if you are a full-time
      student with no income of your own, you should declare the combined income of
      your parents or legal guardians instead.
    </p>
    <div className="heading">
      What documents do you require to verify the income information I entered?
    </div>
    <p>
      If we ask you for supporting documentation to verify the income you declared,
      we require that you submit the a photocopy of the most recent tax return of all
      income earners in your household as defined above.
    </p>
    <div className="heading">
      What if I am unable to provide you with a tax return?
    </div>
    <p>
      If you unable able to provide us with your tax return form, we will accept
      notarized income statements. An income statement is a statement of annual
      salary, printed on the official letterhead of the relevant employer (including
      the employer’s address and contact information) and signed by the employer.
      Notarization means that the income statement you submit to us has to signed
      by an authorized notary and contain his or her official seal/stamp and
      contact information. If your household income is based on more than one
      earner, you have to submit notarized income statements for each of the people
      whose income you used to calculate total household income.
    </p>
    <div className="heading">
      What if I am unemployed, and not a student?
    </div>
    <p>
      Please submit either one of the following: a tax return (filed for zero
      income), a photocopy of an official receipt or check of unemployment benefits
      received, or a notarized letter verifying your unemployment status.
    </p>
    <div className="heading">
      What should I do if my financial documents are written in a language other than English?
    </div>
    <p>
      Please submit notarized income statement(s) in English, if at all possible. If
      the employer(s) in question are unable to provide you with income statement(s)
      written in English, you have to provide a translation of the statement(s) and
      submit this along with the original, notarized income statement when you mail
      or fax your documents. If you are submitting a tax return in a language other
      than English, you also have to provide a translation in addition to the tax
      return. We do not require the translation to be certified – you can translate
      the document yourself.
    </p>
  </Dialog>
);

export default DocsInstructionsDialog;

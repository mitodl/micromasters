// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

const skipActions = (cancel, skip) => (
  <div className="actions">
    <Button
      type='button'
      className="cancel-button"
      onClick={cancel}>
      Cancel
    </Button>
    <Button
      type='button'
      className="save-button"
      onClick={skip}>
      Pay Full Price
    </Button>
  </div>
);

type SkipProps = {
  cancel:     () => void,
  skip:       () => void,
  open:       boolean,
  fullPrice:  React$Element<*>,
}

const SkipFinancialAidDialog = ({cancel, skip, open, fullPrice}: SkipProps) => (
  <Dialog
    title="Are you sure?"
    titleClassName="dialog-title"
    contentClassName="dialog dialog-skip-financial-aid"
    open={open}
    className="skip-aid-dialog-wrapper"
    bodyClassName="skip-aid-dialog"
    onRequestClose={cancel}
    actions={skipActions(cancel, skip)}
  >
    You may qualify for a reduced cost. Clicking "Pay Full Price"
    means that you are declining this option and you will pay the
    full price of
    {" "}{fullPrice}{" "}
    for each course in the program.
  </Dialog>
);

export default SkipFinancialAidDialog;

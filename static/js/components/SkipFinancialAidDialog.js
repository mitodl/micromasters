// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

const skipActions = (cancel, skip) => (
  <div className="actions">
    <Button
      type='button'
      className="secondary-button cancel-button"
      onClick={cancel}>
      Cancel
    </Button>
    <Button
      type='button'
      className="primary-button save-button"
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
    contentClassName="dialog skip-financial-aid-dialog"
    className="skip-financial-aid-dialog-wrapper"
    open={open}
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

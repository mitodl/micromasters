// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

import { FETCH_PROCESSING } from '../actions';
import SpinnerButton from './SpinnerButton';

const skipActions = (cancel, skip, fetchAddStatus, fetchSkipStatus) => (
  <div className="actions">
    <Button
      type='button'
      className="secondary-button cancel-button"
      onClick={cancel}>
      Cancel
    </Button>
    <SpinnerButton
      component={Button}
      spinning={fetchSkipStatus === FETCH_PROCESSING}
      disabled={fetchAddStatus === FETCH_PROCESSING}
      type='button'
      className="primary-button save-button skip-button"
      onClick={skip}>
      Pay Full Price
    </SpinnerButton>
  </div>
);

type SkipProps = {
  cancel:           () => void,
  skip:             () => void,
  open:             boolean,
  fullPrice:        React$Element<*>,
  fetchAddStatus?:  string,
  fetchSkipStatus?: string,
}

const SkipFinancialAidDialog = ({cancel, skip, open, fullPrice, fetchAddStatus, fetchSkipStatus}: SkipProps) => (
  <Dialog
    title="Are you sure?"
    titleClassName="dialog-title"
    contentClassName="dialog skip-financial-aid-dialog"
    className="skip-financial-aid-dialog-wrapper"
    open={open}
    onRequestClose={cancel}
    actions={skipActions(cancel, skip, fetchAddStatus, fetchSkipStatus)}
  >
    You may qualify for a reduced cost. Clicking "Pay Full Price"
    means that you are declining this option and you will pay the
    full price of
    {" "}{fullPrice}{" "}
    for each course in the program.
  </Dialog>
);

export default SkipFinancialAidDialog;

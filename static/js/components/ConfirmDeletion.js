// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';

import { dialogActions } from './inputs/util';

const dialogTitle = (item = "entry") => (`Delete this ${item}?`);

export default class ConfirmDeletion extends React.Component {
  props: {
    close:        () => void,
    deleteFunc:   () => Promise<*>,
    open:         boolean,
    inFlight:     boolean,
    itemText:     string,
  };

  deleteAndClose = (): void => {
    const { close, deleteFunc } = this.props;
    deleteFunc().then(close);
  };

  render () {
    const { close, open, inFlight, itemText } = this.props;
    return (
      <Dialog
        title={dialogTitle(itemText)}
        className="deletion-confirmation-dialog-wrapper"
        titleClassName="dialog-title"
        contentClassName="dialog deletion-confirmation-dialog"
        open={open}
        onRequestClose={close}
        actions={dialogActions(close, this.deleteAndClose, inFlight, 'Delete', 'delete-button')}
        autoScrollBodyContent={true}
      >
      </Dialog>
    );
  }
}

// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

const dialogTitle = (item="entry") => (`Delete this ${item}?`);

export default class ConfirmDeletion extends React.Component {
  props: {
    close:        () => void,
    deleteFunc:   () => void,
    open:         boolean,
    itemText:     string,
  };

  deleteAndClose: Function = (): void => {
    const { close, deleteFunc } = this.props;
    deleteFunc();
    close();
  };

  render () {
    const { close, open, itemText } = this.props;
    let actions = [
      <Button
        type='button'
        key='close'
        className="secondary-button cancel-button"
        onClick={close}>
        Cancel
      </Button>,
      <Button
        key='delete'
        type='button'
        className="primary-button delete-button"
        onClick={this.deleteAndClose}>
        Delete
      </Button>
    ];
    return (
      <Dialog
        title={dialogTitle(itemText)}
        className="deletion-confirmation-dialog-wrapper"
        titleClassName="dialog-title"
        contentClassName="dialog deletion-confirmation-dialog"
        open={open}
        onRequestClose={close}
        actions={actions}
        autoScrollBodyContent={true}
      >
      </Dialog>
    );
  }
}

import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

import { personalValidation } from '../util/validation';
import PersonalForm from './PersonalForm';

export default class UserPagePersonalDialog extends React.Component {
  static propTypes = {
    setUserPageDialogVisibility:  React.PropTypes.func,
    ui:                           React.PropTypes.object,
    profile:                      React.PropTypes.object,
    saveProfile:                  React.PropTypes.func,
    clearProfileEdit:             React.PropTypes.func,
  };

  closePersonalDialog = () => {
    const { setUserPageDialogVisibility, clearProfileEdit } = this.props;
    setUserPageDialogVisibility(false);
    clearProfileEdit();
  };

  savePersonalInfo = () => {
    const { profile, ui, saveProfile } = this.props;
    saveProfile(personalValidation, profile, ui).then(() => {
      this.closePersonalDialog();
    });
  };

  render () {
    const { ui: { userPageDialogVisibility } } = this.props;
    const actions = [
      <Button
        type='button'
        key='cancel'
        className='cancel-button'
        onClick={this.closePersonalDialog}>
        Cancel
      </Button>,
      <Button
        key='save'
        type='button'
        className='save-button'
        onClick={this.savePersonalInfo}>
        Save
      </Button>
    ];

    return (
      <Dialog
        open={userPageDialogVisibility}
        onRequestClose={this.closePersonalDialog}
        actions={actions}
        autoScrollBodyContent={true}>
        <PersonalForm {...this.props} />
      </Dialog>
    );
  }
}

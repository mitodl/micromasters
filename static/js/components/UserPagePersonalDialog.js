// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

import { FETCH_PROCESSING } from '../actions';
import { personalValidation } from '../lib/validation/profile';
import PersonalForm from './PersonalForm';
import SpinnerButton from './SpinnerButton';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

export default class UserPagePersonalDialog extends React.Component {
  props: {
    setUserPageDialogVisibility:  () => void,
    ui:                           UIState,
    profile:                      Profile,
    profilePatchStatus:           ?string,
    saveProfile:                  SaveProfileFunc,
    clearProfileEdit:             () => void,
  };

  closePersonalDialog: Function = (): void => {
    const {
      setUserPageDialogVisibility,
      clearProfileEdit,
      profile: { username }
    } = this.props;
    setUserPageDialogVisibility(false);
    clearProfileEdit(username);
  };

  savePersonalInfo: Function = (): void => {
    const { profile, ui, saveProfile } = this.props;
    saveProfile(personalValidation, profile, ui).then(() => {
      this.closePersonalDialog();
    });
  };

  render () {
    const { ui: { userPageDialogVisibility }, profilePatchStatus } = this.props;
    const inFlight = profilePatchStatus === FETCH_PROCESSING;
    const actions = [
      <Button
        type='button'
        className='secondary-button cancel-button'
        key='cancel'
        onClick={this.closePersonalDialog}>
        Cancel
      </Button>,
      <SpinnerButton
        component={Button}
        spinning={inFlight}
        type='button'
        className="primary-button save-button"
        key='save'
        onClick={this.savePersonalInfo}>
        Save
       </SpinnerButton>
    ];

    return (
      <Dialog
        title="Edit Personal Info"
        titleClassName="dialog-title"
        contentClassName="dialog personal-dialog"
        className="personal-dialog-wrapper"
        open={userPageDialogVisibility}
        onRequestClose={this.closePersonalDialog}
        actions={actions}
        autoScrollBodyContent={true}>
        <PersonalForm {...this.props} validator={personalValidation} />
      </Dialog>
    );
  }
}

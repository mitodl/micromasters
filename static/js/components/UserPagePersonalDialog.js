// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';

import { dialogActions } from './inputs/util';
import { FETCH_PROCESSING } from '../actions';
import { personalValidation } from '../lib/validation/profile';
import PersonalForm from './PersonalForm';
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

    return (
      <Dialog
        title="Edit Personal Info"
        titleClassName="dialog-title"
        contentClassName="dialog personal-dialog"
        className="personal-dialog-wrapper"
        open={userPageDialogVisibility}
        onRequestClose={this.closePersonalDialog}
        actions={dialogActions(this.closePersonalDialog, this.savePersonalInfo, inFlight)}
        autoScrollBodyContent={true}>
        <PersonalForm {...this.props} validator={personalValidation} />
      </Dialog>
    );
  }
}

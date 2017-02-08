// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';

import { dialogActions } from './inputs/util';
import { FETCH_PROCESSING } from '../actions';
import { personalValidation } from '../lib/validation/profile';
import PersonalForm from './PersonalForm';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

export default class LearnerPagePersonalDialog extends React.Component {
  props: {
    setLearnerPageDialogVisibility:  () => void,
    ui:                              UIState,
    profile:                         Profile,
    profilePatchStatus:              ?string,
    saveProfile:                     SaveProfileFunc,
    clearProfileEdit:                () => void,
  };

  closePersonalDialog = (): void => {
    const {
      setLearnerPageDialogVisibility,
      clearProfileEdit,
      profile: { username }
    } = this.props;
    setLearnerPageDialogVisibility(false);
    clearProfileEdit(username);
  };

  savePersonalInfo = (): void => {
    const { profile, ui, saveProfile } = this.props;
    saveProfile(personalValidation, profile, ui).then(() => {
      this.closePersonalDialog();
    });
  };

  render () {
    const { ui: { learnerPageDialogVisibility }, profilePatchStatus } = this.props;
    const inFlight = profilePatchStatus === FETCH_PROCESSING;

    return (
      <Dialog
        title="Edit Personal Info"
        titleClassName="dialog-title"
        contentClassName="dialog personal-dialog"
        className="personal-dialog-wrapper"
        open={learnerPageDialogVisibility}
        onRequestClose={this.closePersonalDialog}
        actions={dialogActions(this.closePersonalDialog, this.savePersonalInfo, inFlight)}
        autoScrollBodyContent={true}>
        <PersonalForm {...this.props} validator={personalValidation} />
      </Dialog>
    );
  }
}

// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

import { personalValidation } from '../lib/validation/profile';
import ProfileFormFields from '../util/ProfileFormFields';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';

export default class UserPageAboutMeDialog extends ProfileFormFields {
  props: {
    ui:                           UIState,
    profile:                      Profile,
    saveProfile:                  SaveProfileFunc,
    clearProfileEdit:             () => void,
    setUserPageAboutMeDialogVisibility:  () => void,
  };

  closeAboutMeDialog: Function = (): void => {
    const {
      setUserPageAboutMeDialogVisibility,
      clearProfileEdit,
      profile: { username }
    } = this.props;
    setUserPageAboutMeDialogVisibility(false);
    clearProfileEdit(username);
  };

  saveAboutMeInfo: Function = (): void => {
    const { profile, ui, saveProfile } = this.props;
    saveProfile(personalValidation, profile, ui).then(() => {
      this.closeAboutMeDialog();
    });
  };

  render () {
    const { ui: { userPageAboutMeDialogVisibility } } = this.props;

    const actions = [
      <Button
        type='button'
        className='secondary-button cancel-button'
        key='cancel'
        onClick={this.closeAboutMeDialog}>
        Cancel
      </Button>,
      <Button
        type='button'
        className='primary-button save-button'
        key='save'
        onClick={this.saveAboutMeInfo}>
        Save
      </Button>
    ];

    return (
      <Dialog
        title="About Me"
        titleClassName="dialog-title"
        contentClassName="dialog about-me-dialog"
        className="about-me-dialog-wrapper"
        open={userPageAboutMeDialogVisibility}
        onRequestClose={this.closeAboutMeDialog}
        actions={actions}
        autoScrollBodyContent={true}>
       {
         this.boundTextField(
           ["about_me"],
           "Introduce yourself",
           true
         )
       }
      </Dialog>
    );
  }
}

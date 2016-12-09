// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import Button from 'react-mdl/lib/Button';

import { FETCH_PROCESSING } from '../actions';
import ProfileFormFields from '../util/ProfileFormFields';
import SpinnerButton from './SpinnerButton';
import type { Profile, SaveProfileFunc } from '../flow/profileTypes';
import type { UIState } from '../reducers/ui';
import type { Validator } from '../lib/validation/profile';

export default class UserPageAboutMeDialog extends ProfileFormFields {
  props: {
    ui:                                   UIState,
    profile:                              Profile,
    profilePatchStatus:                   ?string,
    saveProfile:                          SaveProfileFunc,
    clearProfileEdit:                     () => void,
    setUserPageAboutMeDialogVisibility:   () => void,
    validator:                            Validator,
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
    const { profile, ui, saveProfile, validator } = this.props;
    saveProfile(validator, profile, ui).then(() => {
      this.closeAboutMeDialog();
    });
  };

  render () {
    const { ui: { userPageAboutMeDialogVisibility }, profilePatchStatus } = this.props;
    const inFlight = profilePatchStatus === FETCH_PROCESSING;

    const actions = [
      <Button
        type='button'
        className='secondary-button cancel-button'
        key='cancel'
        onClick={this.closeAboutMeDialog}>
        Cancel
      </Button>,
      <SpinnerButton
        component={Button}
        spinning={inFlight}
        type='button'
        className="primary-button save-button"
        key='save'
        onClick={this.saveAboutMeInfo}>
        Save
      </SpinnerButton>
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

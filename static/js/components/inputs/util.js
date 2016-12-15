// @flow
import React from 'react';
import Button from 'react-mdl/lib/Button';

import SpinnerButton from '../SpinnerButton';

/**
 * Helper function to create dialog action buttons, with a SpinnerButton for the save button
 */
export const dialogActions = (
  onCancel: Function, onSave: Function, inFlight: bool, text: string='Save', saveClass: string='', disabled: bool=false
) => ([
  <Button
    type='cancel'
    key='cancel'
    className="secondary-button cancel-button"
    onClick={onCancel}>
    Cancel
  </Button>,
  <SpinnerButton
    component={Button}
    spinning={inFlight}
    disabled={disabled}
    type='button'
    key='save'
    className={`${disabled ? 'secondary-button' : 'primary-button'} save-button ${saveClass}`}
    onClick={onSave}>
    {text}
  </SpinnerButton>
]);

// @flow
import { assert } from 'chai';

import { dialogActions } from './util';

describe('input functions', () => {

  describe('dialogActions', () => {
    it('renders properly', () => {
      let onCancel = () => null;
      let onSave = () => null;
      let inFlight = true;
      let newClass = "new-class";
      let newText = "New Text";
      let actions = dialogActions(onCancel, onSave, inFlight, newText, newClass);
      assert.lengthOf(actions, 2);
      let [cancelButton, saveButton] = actions;
      assert.equal(cancelButton.props.className, "secondary-button cancel-button");
      assert.equal(cancelButton.props.onClick, onCancel);
      assert.equal(cancelButton.props.children, "Cancel");

      assert.equal(saveButton.props.className, `primary-button save-button ${newClass}`);
      assert.equal(saveButton.props.onClick, onSave);
      assert.equal(saveButton.props.children, newText);
      assert.equal(saveButton.props.spinning, inFlight);
      assert.equal(saveButton.type.name, "SpinnerButton");
    });
  });
});

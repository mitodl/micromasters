/* global SETTINGS: false */
import React from 'react';
import TestUtils from 'react-addons-test-utils';
import { mount } from 'enzyme';
import { assert } from 'chai';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import { Provider } from 'react-redux';

import ProfileImage from './ProfileImage';
import IntegrationTestHelper from '../util/integration_test_helper';
import ProfileImageUploader from '../components/ProfileImageUploader';
import { setPhotoDialogVisibility } from '../actions/ui';
import * as api from '../lib/api';
import {
  startPhotoEdit,
  updatePhotoEdit,
  requestPatchUserPhoto,
} from '../actions/image_upload';

describe('ProfileImage', () => {
  let helper, sandbox, updateProfileImageStub, div;

  const thatProfile = {
    username: 'rfeather',
    email: 'rf@example.com',
    first_name: 'Reginald',
    last_name: 'Feathersworth',
    preferred_name: 'Reggie'
  };

  const renderProfileImage = (props = {}) => {
    div = document.createElement("div");
    return mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <Provider store={helper.store}>
          <ProfileImage
            profile={thatProfile}
            {...props}
          />
        </Provider>
      </MuiThemeProvider>,
      {
        attachTo: div
      }
    );
  };

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    sandbox = helper.sandbox;
    // thatProfile is the logged in user
    SETTINGS.user.username = thatProfile.username;
    updateProfileImageStub = sandbox.stub(api, 'updateProfileImage');
    updateProfileImageStub.withArgs(thatProfile.username).returns(Promise.resolve());
    helper.profileGetStub.withArgs(thatProfile.username).returns(Promise.resolve(thatProfile));
  });

  afterEach(() => {
    helper.cleanup();
  });

  describe('upload button', () => {
    it('should be hidden if not editable', () => {
      let image = renderProfileImage({
        editable: false
      });

      assert.lengthOf(
        image.find('.open-photo-dialog'),
        0,
        'image should contain a button to upload a profile photo'
      );
    });

    it('should be visible if editable and is users own profile', () => {
      let image = renderProfileImage({
        editable: true
      });

      assert.lengthOf(
        image.find('.open-photo-dialog'),
        1,
        'image should contain a button to upload a profile photo'
      );
    });

    it('should be hidden if editable and another users profile', () => {
      SETTINGS.user.username = 'other';
      let image = renderProfileImage({
        editable: true
      });

      assert.lengthOf(
        image.find('.open-photo-dialog'),
        0,
        'image should not contain a button to upload a profile photo'
      );
    });

    it("should display a 'open' link with the correct link text if passed the right props", () => {
      let image = renderProfileImage({
        editable: true,
        showLink: true,
        linkText: 'some link text'
      });

      let link = image.find('a');
      assert.equal(link.text(), 'some link text');
      link.simulate('click');
      assert.ok(
        helper.store.getState().ui.photoDialogVisibility,
        'should be open now'
      );
    });

    it('should call an afterImageUpload prop after success, if it is present', () => {
      let afterImageUpload = sandbox.stub().returns(Promise.resolve());
      let image = renderProfileImage({
        editable: true,
        afterImageUpload: afterImageUpload,
      });
      helper.store.dispatch(startPhotoEdit({ name: 'a name' }));
      helper.store.dispatch(updatePhotoEdit({ name: 'a name'}));
      let uploader = image.find(ProfileImageUploader);
      return uploader.props().updateUserPhoto().then(() => {
        assert.ok(
          afterImageUpload.called,
          'afterImageUpload callback should have been called'
        );
      });
    });

    it("should have a ProfileImageUploader only for the logged in user", () => {
      for (const loggedIn of [true, false]) {
        SETTINGS.user.username = loggedIn ? thatProfile.username : "other_user";
        let image = renderProfileImage({
          editable: true,
        });

        assert.equal(image.find("ProfileImageUploader").length === 1, loggedIn);
      }
    });

    describe('save button', () => {
      it("should show the save button when there's an image", () => {
        renderProfileImage({
          editable: true
        });
        helper.store.dispatch(startPhotoEdit({name: 'a name'}));
        helper.store.dispatch(setPhotoDialogVisibility(true));
        let dialog = document.querySelector(".photo-upload-dialog");
        let saveButton = dialog.querySelector('.save-button');
        assert.isFalse(saveButton.className.includes('disabled'));
        assert.isNull(dialog.querySelector('.mdl-spinner'));
        TestUtils.Simulate.click(saveButton);
        assert.isTrue(updateProfileImageStub.called);
      });

      it('should disable the save button if no image is picked', () => {
        renderProfileImage({
          editable: true
        });
        helper.store.dispatch(setPhotoDialogVisibility(true));
        let dialog = document.querySelector(".photo-upload-dialog");
        let saveButton = dialog.querySelector('.save-button');
        assert.isTrue(saveButton.disabled);
        assert.isFalse(saveButton.innerHTML.includes("mdl-spinner"));
        TestUtils.Simulate.click(saveButton);
        assert.isFalse(updateProfileImageStub.called);
        assert.isNull(dialog.querySelector('.mdl-spinner'));
      });

      it('should show a spinner while uploading the image', () => {
        renderProfileImage({
          editable: true
        });
        helper.store.dispatch(startPhotoEdit({name: 'a name'}));
        helper.store.dispatch(setPhotoDialogVisibility(true));
        helper.store.dispatch(requestPatchUserPhoto(SETTINGS.user.username));
        let dialog = document.querySelector(".photo-upload-dialog");
        assert.isNotNull(dialog.querySelector('.mdl-spinner'));
      });

      it('should disable the save button when uploading an image', () => {
        renderProfileImage({
          editable: true
        });
        helper.store.dispatch(startPhotoEdit({name: 'a name'}));
        helper.store.dispatch(setPhotoDialogVisibility(true));
        helper.store.dispatch(requestPatchUserPhoto(SETTINGS.user.username));
        let dialog = document.querySelector(".photo-upload-dialog");
        let saveButton = dialog.querySelector('.save-button');
        assert.isTrue(saveButton.disabled);
        assert.isFalse(saveButton.innerHTML.includes("mdl-spinner"));
        TestUtils.Simulate.click(saveButton);
        assert.isFalse(updateProfileImageStub.called);
      });
    });
  });
});

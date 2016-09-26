import {
  startPhotoEdit,
  START_PHOTO_EDIT,
  clearPhotoEdit,
  CLEAR_PHOTO_EDIT,
  updatePhotoEdit,
  UPDATE_PHOTO_EDIT,
  requestPatchUserPhoto,
  REQUEST_PATCH_USER_PHOTO,
  RECEIVE_PATCH_USER_PHOTO_FAILURE,
  RECEIVE_PATCH_USER_PHOTO_SUCCESS,
  updateUserPhoto,
} from '../actions/image_upload';
import { INITIAL_IMAGE_UPLOAD_STATE } from './image_upload';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import configureTestStore from 'redux-asserts';
import rootReducer from '../reducers';
import { assert } from 'chai';
import sinon from 'sinon';
import * as api from '../util/api';

describe('image upload reducer', () => {
  let sandbox, store, dispatchThen;
  let updateProfileImageStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.imageUpload);
    updateProfileImageStub = sandbox.stub(api, 'updateProfileImage');
  });

  afterEach(() => {
    sandbox.restore();
    store = null;
    dispatchThen = null;
  });

  it('should have some initial state', () => {
    return dispatchThen({type: 'unknown'}, ['unknown']).then(state => {
      assert.deepEqual(state, INITIAL_IMAGE_UPLOAD_STATE);
    });
  });

  it('should start editing a photo', () => {
    return dispatchThen(startPhotoEdit('a photo'), [START_PHOTO_EDIT]).then(state => {
      assert.deepEqual(state, {
        edit: null,
        photo: 'a photo',
        patchStatus: null
      });
    });
  });

  it('should let you update an edit in progress', () => {
    let first = new Blob;
    let second = new Blob;
    store.dispatch(startPhotoEdit(first));

    return dispatchThen(updatePhotoEdit(second), [UPDATE_PHOTO_EDIT]).then(state => {
      assert.deepEqual(state, {
        edit: second,
        photo: first,
        patchStatus: null
      });
    });
  });

  it('should clear an edit in progress', () => {
    store.dispatch(startPhotoEdit('a photo'));
    return dispatchThen(clearPhotoEdit(), [CLEAR_PHOTO_EDIT]).then(state => {
      assert.deepEqual(state, {
        edit: null,
        photo: null,
        patchStatus: null
      });
    });
  });

  describe('PATCHING the photo', () => {
    let user = 'jane';
    let photo = new Blob;
    let filename = 'a photo';

    it('should patch the profile image', () => {
      updateProfileImageStub.returns(Promise.resolve('success'));
      return dispatchThen(updateUserPhoto(user, photo, filename), [
        REQUEST_PATCH_USER_PHOTO,
        RECEIVE_PATCH_USER_PHOTO_SUCCESS
      ]).then(state => {
        assert.deepEqual(state, {
          edit: null,
          photo: null,
          patchStatus: FETCH_SUCCESS
        });
      });
    });

    it('should fail to patch the profile image', () => {
      updateProfileImageStub.returns(Promise.reject('oops'));

      return dispatchThen(updateUserPhoto(user, photo, filename), [
        REQUEST_PATCH_USER_PHOTO,
        RECEIVE_PATCH_USER_PHOTO_FAILURE
      ]).then(state => {
        assert.deepEqual(state, {
          edit: null,
          photo: null,
          patchStatus: FETCH_FAILURE
        });
      });
    });

    it('should set FETCH_PROCESSING while updating', () => {
      let photo = new Blob;
      store.dispatch(startPhotoEdit(photo));
      return dispatchThen(requestPatchUserPhoto(), [REQUEST_PATCH_USER_PHOTO]).then(state => {
        assert.deepEqual(state, {
          edit: null,
          photo: photo,
          patchStatus: FETCH_PROCESSING
        });
      });
    });
  });
});

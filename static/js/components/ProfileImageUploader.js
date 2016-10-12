// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import R from 'ramda';
import Dropzone from 'react-dropzone';
import Button from 'react-mdl/lib/Button';

import CropperWrapper from './CropperWrapper';
import type { ImageUploadState } from '../reducers/image_upload';

const onDrop = R.curry((startPhotoEdit, files) => startPhotoEdit(...files));

const dropZone = (startPhotoEdit, setPhotoError) => (
  <Dropzone
    onDrop={onDrop(startPhotoEdit)}
    className="photo-active-item photo-dropzone"
    activeClassName="photo-active-item photo-dropzone active"
    accept="image/*"
    onDropRejected={() => setPhotoError('Please select a valid photo')}
  >
    <div>
      Drag a photo here or click to select a photo.
    </div>
  </Dropzone>
);

const imageError = err => <div className="img-error">{err}</div>;

type ImageUploadProps = {
  photoDialogOpen:      boolean;
  setDialogVisibility:  (b: boolean) => void;
  startPhotoEdit:       (p: File) => void;
  clearPhotoEdit:       () => void;
  imageUpload:          ImageUploadState;
  updateUserPhoto:      (i: string) => Promise<string>,
  updatePhotoEdit:      (b: Blob) => void;
  setPhotoError:        (s: string) => void;
};

const ProfileImageUploader = ({
  photoDialogOpen,
  setDialogVisibility,
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  imageUpload: { photo, error },
  updateUserPhoto,
  setPhotoError,
}: ImageUploadProps) => (
  <Dialog
    open = {photoDialogOpen}
    className="photo-upload-dialog"
    onRequestClose={() => setDialogVisibility(false)}
    autoScrollBodyContent={true}
    title="Upload a Profile Photo"
    contentStyle={{ maxWidth: '620px' }}
    actions = {[
      <Button
        type='button'
        className='cancel-button'
        key="cancel"
        onClick={() => {
          setDialogVisibility(false);
          clearPhotoEdit();
        }}>
        Cancel
      </Button>,
      <Button
        type='button'
        className='save-button'
        key="save"
        onClick={updateUserPhoto}>
        Save
      </Button>
    ]}
  >
    { photo ? <CropperWrapper {...{updatePhotoEdit, photo}} /> : dropZone(startPhotoEdit, setPhotoError) }
    { imageError(error) }
  </Dialog>
);

export default ProfileImageUploader;

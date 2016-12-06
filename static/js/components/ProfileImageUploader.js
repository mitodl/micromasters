// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import R from 'ramda';
import Dropzone from 'react-dropzone';
import Button from 'react-mdl/lib/Button';

import CropperWrapper from './CropperWrapper';
import { FETCH_PROCESSING } from '../actions';
import type { ImageUploadState } from '../reducers/image_upload';

const onDrop = R.curry((startPhotoEdit, files) => startPhotoEdit(...files));

const dropZone = (startPhotoEdit, setPhotoError) => (
  <Dropzone
    onDrop={onDrop(startPhotoEdit)}
    style={{height: uploaderBodyHeight()}}
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

const uploaderBodyHeight = (): number => (
  R.min(500, window.innerHeight / 2)
);

const imageError = err => <div className="img-error">{err}</div>;

type ImageUploadProps = {
  photoDialogOpen:      boolean,
  setDialogVisibility:  (b: boolean) => void,
  startPhotoEdit:       (p: File) => void,
  clearPhotoEdit:       () => void,
  imageUpload:          ImageUploadState,
  updateUserPhoto:      (i: string) => Promise<string>,
  updatePhotoEdit:      (b: Blob) => void,
  setPhotoError:        (s: string) => void,
};

const ProfileImageUploader = ({
  photoDialogOpen,
  setDialogVisibility,
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  imageUpload: { photo, error, patchStatus },
  updateUserPhoto,
  setPhotoError,
}: ImageUploadProps) => {
  const disabled = patchStatus === FETCH_PROCESSING || !photo;

  return <Dialog
    title="Upload a Profile Photo"
    titleClassName="dialog-title"
    contentClassName="dialog photo-upload-dialog"
    className="photo-upload-dialog-wrapper"
    onRequestClose={() => setDialogVisibility(false)}
    autoScrollBodyContent={true}
    contentStyle={{ maxWidth: '620px' }}
    open={photoDialogOpen}
    actions = {[
      <Button
        type='button'
        className='secondary-button cancel-button'
        key="cancel"
        onClick={() => {
          setDialogVisibility(false);
          clearPhotoEdit();
        }}>
        Cancel
      </Button>,
      <Button
        type='button'
        className={`save-button ${disabled ? 'secondary-button disabled': 'primary-button'}`}
        key="save"
        onClick={disabled ? undefined: updateUserPhoto}>
        Save
      </Button>
    ]}
  >
   { imageError(error) }
   { photo ? <CropperWrapper
     {...{updatePhotoEdit, photo, uploaderBodyHeight}} /> : dropZone(startPhotoEdit, setPhotoError)
   }
  </Dialog>;
};

export default ProfileImageUploader;

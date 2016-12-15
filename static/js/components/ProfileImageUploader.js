// @flow
import React from 'react';
import Dialog from 'material-ui/Dialog';
import R from 'ramda';
import Dropzone from 'react-dropzone';
import Spinner from 'react-mdl/lib/Spinner';

import CropperWrapper from './CropperWrapper';
import { FETCH_PROCESSING } from '../actions';
import type { ImageUploadState } from '../reducers/image_upload';
import { dialogActions } from './inputs/util';

const onDrop = R.curry((startPhotoEdit, files) => startPhotoEdit(...files));

const dropZone = (startPhotoEdit, setPhotoError) => (
  <Dropzone
    onDrop={onDrop(startPhotoEdit)}
    style={{height: uploaderBodyHeight()}}
    className="photo-active-item photo-dropzone dashed-border"
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

const dialogContents = (
  updatePhotoEdit,
  photo,
  startPhotoEdit,
  setPhotoError,
  inFlight
) => {
  if ( inFlight ) {
    return <div
      className="photo-active-item dashed-border spinner"
      style={{height: uploaderBodyHeight()}}
    >
      <Spinner singleColor />
    </div>;
  } else if ( photo ) {
    return <CropperWrapper
      updatePhotoEdit={updatePhotoEdit}
      photo={photo}
      uploaderBodyHeight={uploaderBodyHeight}
    />;
  } else {
    return dropZone(startPhotoEdit, setPhotoError);
  }
};

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
  const inFlight = patchStatus === FETCH_PROCESSING;
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
    actions = { dialogActions(
      () => {
        setDialogVisibility(false);
        clearPhotoEdit();
      },
      updateUserPhoto,
      false,
      'Save',
      '',
      disabled,
    ) }
  >
   { imageError(error) }
   { dialogContents(
     updatePhotoEdit,
     photo,
     startPhotoEdit,
     setPhotoError,
     inFlight
   )}
  </Dialog>;
};

export default ProfileImageUploader;

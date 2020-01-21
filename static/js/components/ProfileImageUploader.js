// @flow
import React from "react"
import Dialog from "@material-ui/core/Dialog"
import R from "ramda"
import Dropzone from "react-dropzone"
import CircularProgress from "@material-ui/core/CircularProgress"

import CropperWrapper from "./CropperWrapper"
import { FETCH_PROCESSING } from "../actions"
import type { ImageUploadState } from "../reducers/image_upload"
import { dialogActions } from "./inputs/util"
import DialogTitle from "@material-ui/core/DialogTitle"
import DialogActions from "@material-ui/core/DialogActions"
import DialogContent from "@material-ui/core/DialogContent"

const onDrop = R.curry((startPhotoEdit, files) => startPhotoEdit(...files))

const dropZone = (startPhotoEdit, setPhotoError) => (
  <Dropzone
    onDrop={onDrop(startPhotoEdit)}
    style={{ height: uploaderBodyHeight() }}
    className="photo-active-item photo-dropzone dashed-border"
    activeClassName="photo-active-item photo-dropzone active"
    accept="image/*"
    onDropRejected={() => setPhotoError("Please select a valid photo")}
  >
    <div className="desktop-upload-message">
      Drag a photo here or click to select a photo.
    </div>
    <div className="mobile-upload-message">Click to select a photo.</div>
  </Dropzone>
)

const uploaderBodyHeight = (): number => R.min(500, window.innerHeight * 0.44)

const imageError = err => <div className="img-error">{err}</div>

const dialogContents = (
  updatePhotoEdit,
  photo,
  startPhotoEdit,
  setPhotoError,
  inFlight
) => {
  if (inFlight) {
    return (
      <div
        className="photo-active-item dashed-border spinner"
        style={{ height: uploaderBodyHeight() }}
      >
        <CircularProgress />
      </div>
    )
  } else if (photo) {
    return (
      <CropperWrapper
        updatePhotoEdit={updatePhotoEdit}
        photo={photo}
        uploaderBodyHeight={uploaderBodyHeight}
      />
    )
  } else {
    return dropZone(startPhotoEdit, setPhotoError)
  }
}

type ImageUploadProps = {
  photoDialogOpen: boolean,
  setDialogVisibility: (b: boolean) => void,
  startPhotoEdit: (p: File) => void,
  clearPhotoEdit: () => void,
  imageUpload: ImageUploadState,
  updateUserPhoto: (i: string) => Promise<string>,
  updatePhotoEdit: (b: Blob) => void,
  setPhotoError: (s: string) => void
}

const ProfileImageUploader = ({
  photoDialogOpen,
  setDialogVisibility,
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  imageUpload: { photo, error, patchStatus },
  updateUserPhoto,
  setPhotoError
  }: ImageUploadProps) => {
  const inFlight = patchStatus === FETCH_PROCESSING
  const disabled = patchStatus === FETCH_PROCESSING || !photo

  return (
    <Dialog
      classes={{
        paper: "dialog photo-upload-dialog",
        root:  "photo-upload-dialog-wrapper"
      }}
      onClose={() => setDialogVisibility(false)}
      open={photoDialogOpen}
    >
      <DialogTitle className="dialog-title">Upload a Profile Photo</DialogTitle>
      <DialogContent dividers>
        {imageError(error)}
        {dialogContents(
          updatePhotoEdit,
          photo,
          startPhotoEdit,
          setPhotoError,
          inFlight
        )}
      </DialogContent>
      <DialogActions>
        {dialogActions(
          () => {
            setDialogVisibility(false)
            clearPhotoEdit()
          },
          updateUserPhoto,
          false,
          "Save",
          "",
          disabled
        )}
      </DialogActions>
    </Dialog>
  )
}

export default ProfileImageUploader

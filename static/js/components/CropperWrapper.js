// @flow
import React from "react"
import Cropper from "react-cropper"
import browser from "detect-browser"

// eslint-disable-next-line require-jsdoc
export default class CropperWrapper extends React.Component {
  cropper: Cropper
  props: {
    updatePhotoEdit: (b: Blob) => void,
    photo: Object,
    uploaderBodyHeight: () => number
  }

  cropperHelper = () => {
    // eslint-disable-next-line no-invalid-this
    const { updatePhotoEdit } = this.props
    let canvas
    // eslint-disable-next-line no-invalid-this
    if (this.cropper) {
      if (browser.name === "safari" || browser.name === "ios") {
        // eslint-disable-next-line no-invalid-this
        canvas = this.cropper.getCroppedCanvas()
      } else {
        // eslint-disable-next-line no-invalid-this
        canvas = this.cropper.getCroppedCanvas({
          width:  512,
          height: 512
        })
      }
      canvas.toBlob(blob => updatePhotoEdit(blob), "image/jpeg")
    }
  }

  // eslint-disable-next-line require-jsdoc
  render() {
    const { photo, uploaderBodyHeight } = this.props

    return (
      <Cropper
        ref={cropper => (this.cropper = cropper)}
        style={{ height: uploaderBodyHeight() }}
        className="photo-active-item cropper"
        src={photo.preview}
        aspectRatio={1 / 1}
        guides={false}
        cropend={this.cropperHelper}
        ready={this.cropperHelper}
      />
    )
  }
}

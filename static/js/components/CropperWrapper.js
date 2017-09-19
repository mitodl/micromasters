// @flow
import React from "react"
import Cropper from "react-cropper"
import browser from "detect-browser"

export default class CropperWrapper extends React.Component {
  cropper: Cropper
  props: {
    updatePhotoEdit: (b: Blob) => void,
    photo: Object,
    uploaderBodyHeight: () => number
  }

  cropperHelper = () => {
    const { updatePhotoEdit } = this.props
    let canvas
    if (this.cropper) {
      if (browser.name === "safari" || browser.name === "ios") {
        canvas = this.cropper.getCroppedCanvas()
      } else {
        canvas = this.cropper.getCroppedCanvas({
          width:  512,
          height: 512
        })
      }
      canvas.toBlob(blob => updatePhotoEdit(blob), "image/jpeg")
    }
  }

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

// @flow
import React from 'react';
import Cropper from 'react-cropper';

export default class CropperWrapper extends React.Component {
  props: {
    updatePhotoEdit:    (b: Blob) => void,
    photo:              Object,
    uploaderBodyHeight: () => number,
  };

  cropperHelper = () => {
    const { updatePhotoEdit } = this.props;
    let canvas = this.refs.cropper.getCroppedCanvas();
    if (canvas.toBlob !== undefined) {
      canvas.toBlob(blob => updatePhotoEdit(blob));
    }
  };

  render () {
    const { photo, uploaderBodyHeight } = this.props;

    return <Cropper
      ref='cropper'
      style={{'height': uploaderBodyHeight()}}
      className="photo-active-item cropper"
      src={photo.preview}
      aspectRatio={ 1 / 1 }
      guides={false}
      cropend={this.cropperHelper}
      ready={this.cropperHelper}
    />;
  }
}

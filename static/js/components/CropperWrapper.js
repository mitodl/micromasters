// @flow
import React from 'react';
import Cropper from 'react-cropper';

export default class CropperWrapper extends React.Component {
  props: {
    updatePhotoEdit:  (b: Blob) => void,
    photo:            Object,
  };

  cropperHelper = () => {
    const { updatePhotoEdit } = this.props;
    this.refs.cropper.getCroppedCanvas().toBlob(blob => updatePhotoEdit(blob));
  };

  render () {
    const { photo } = this.props;
    return <Cropper
      ref='cropper'
      className="photo-active-item cropper"
      src={photo.preview}
      aspectRatio={ 1 / 1 }
      guides={false}
      cropend={this.cropperHelper}
      ready={this.cropperHelper}
    />;
  }
}

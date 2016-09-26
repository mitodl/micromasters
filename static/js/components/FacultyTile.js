// @flow
import React from 'react';


export default class FacultyTile extends React.Component {
  props: {
    name:      string,
    title:     string,
    short_bio: string,
    image:     Object,
  }
  render() {
    const { name, title, short_bio, image } = this.props;
    const shortBio = short_bio;  // eslint-disable-line camelcase
    let nameStr, imageTag;
    if (title) {
      nameStr = `${name}, ${title}`;
    } else {
      nameStr = name;
    }
    if ( image && image.file ) {
      imageTag = <img src={image.file} alt={image.alt} />;
    } else {
      imageTag = null;
    }
    return (
      <div className="faculty-tile">
        <h4>{nameStr}</h4>
        {imageTag}
        <p>{shortBio}</p>
      </div>
    );
  }
}
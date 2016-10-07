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
    const {
      name,
      title,
      short_bio: shortBio,
      image: {
        alt,
        rendition: {
          width,
          height,
          file,
        }
      }
    } = this.props;
    let nameStr;
    if (title) {
      nameStr = `${name}, ${title}`;
    } else {
      nameStr = name;
    }

    let imageTag = <img src={file} alt={alt} width={width} height={height} />;

    return (
      <div className="faculty-tile">
        {imageTag}
        <h4>{nameStr}</h4>
        <p>{shortBio}</p>
      </div>
    );
  }
}

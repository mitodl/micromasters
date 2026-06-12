// @flow
import React from "react"

export default class FacultyTile extends React.Component {
  props: {
    name: string,
    title: string,
    short_bio: string,
    image: Object
  }
  render() {
    const { name, title, short_bio: shortBio, image } = this.props
    let nameStr, imgEl
    if (title) {
      nameStr = `${name}, ${title}`
    } else {
      nameStr = name
    }
    if (image) {
      const {
        alt,
        rendition: { width, height, file }
      } = image
      imgEl = <img src={file} alt={alt} width={width} height={height} />
    } else {
      imgEl = null
    }

    return (
      <div className="faculty-tile">
        {imgEl}
        <div className="faculty-copy">
          <h4 className="faculty-name">{nameStr}</h4>
          <p className="faculty-bio">{shortBio}</p>
        </div>
      </div>
    )
  }
}

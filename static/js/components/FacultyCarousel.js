// @flow
import React from 'react';
import Slider from 'react-slick';


class FacultyTile extends React.Component {
  props: {
    name:     string,
    title:    string,
    imageUrl: string,
    bio:      string,
  }
  render() {
    const { name, title, bio, imageUrl } = this.props;
    let nameStr;
    if (title) {
      nameStr = `${name}, ${title}`;
    } else {
      nameStr = name;
    }
    let style = {"backgroundImage": `url(${imageUrl})`};
    return (
      <div className="faculty-tile" style={style}>
        <h4>{nameStr}</h4>
        <p>{bio}</p>
      </div>
    );
  }
}


export default class FacultyCarousel extends React.Component {
  props: {
    faculty:  Array<Object>,
  }
  render() {
    let settings = {
      dots: true,
      dotsClass: "slick-dots",
      infinite: false,
      speed: 500,
      slidesToShow: 2.2,
      slidesToScroll: 1,
      adaptiveHeight: false,
    };
    const tiles = this.props.faculty.map((faculty, index) =>
      // react-slick only works with <div>s, not React components,
      // so wrap the FacultyTile component in a meaningless <div>
      <div key={index}><FacultyTile {...faculty} /></div>
    );
    return (
      <Slider {...settings}>
        {tiles}
      </Slider>
    );
  }
}

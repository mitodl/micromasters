// @flow
import React from 'react';
import Slider from 'react-slick';
import FacultyTile from './FacultyTile';


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
      responsive: [{
        breakpoint: 992,
        settings: {
          slidesToShow: 1.5,
        }
      }]
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

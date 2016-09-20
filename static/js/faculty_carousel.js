import React from 'react';
import ReactDOM from 'react-dom';
import Slider from 'react-slick';


class FacultyTile extends React.Component {
  render() {
    let nameStr;
    if (this.props.title) {
      nameStr = this.props.name + ", " + this.props.title
    } else {
      nameStr = this.props.name
    }
    let style = {'backgroundImage': 'url('+this.props.imageUrl+')'};
    return (
      <div className="faculty-tile" style={style}>
        <h4>{nameStr}</h4>
        <p>{this.props.bio}</p>
      </div>
    )
  }
}


class FacultyCarousel extends React.Component {
  render() {
    let settings = {
      dots: true,
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
    )
    return (
      <Slider {...settings}>
        {tiles}
      </Slider>
    );
  }
}


// define a generic `map` function, that can be used on a NodeList
let map = (...fnargs) => {
  let args = [].slice.call(fnargs, 0);
  let ctx = args.shift();
  return [].map.apply(ctx, args);
}


// map over the <li> nodes to get faculty information
const carouselDiv = document.querySelector('#faculty-carousel');
let faculty = map(carouselDiv.querySelectorAll("li"), (li) => {
  let data = {};
  let imgEl = li.querySelector("img.faculty-photo");
  if (imgEl) {
    data.imageUrl = imgEl.src;
  }
  ["name", "title", "bio"].forEach((attr) => {
    let el = li.querySelector(`p.faculty-${attr}`);
    if (el) {
      data[attr] = el.textContent;
    }
  })
  return data;
});


// pass faculty information to the <FacultyCarousel> component
ReactDOM.render(
  <FacultyCarousel faculty={faculty} />,
  carouselDiv
)

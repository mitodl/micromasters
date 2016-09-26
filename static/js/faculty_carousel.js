// @flow
import FacultyCarousel from './components/FacultyCarousel';
import React from 'react';
import ReactDOM from 'react-dom';


// define a generic `map` function, that can be used on a NodeList
let map = (...fnargs) => {
  let args = [].slice.call(fnargs, 0);
  let ctx = args.shift();
  return [].map.apply(ctx, args);
};


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
  });
  return data;
});


// pass faculty information to the <FacultyCarousel> component
ReactDOM.render(
  <FacultyCarousel faculty={faculty} />,
  carouselDiv
);

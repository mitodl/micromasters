// @flow
import FacultyCarousel from './components/FacultyCarousel';
import React from 'react';
import ReactDOM from 'react-dom';


// map over the <li> nodes to get faculty information
const carouselDiv = document.querySelector('#faculty-carousel');

let faculty = Array.from(carouselDiv.querySelectorAll("li")).map((li) => {
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

// empty the carouselDiv
while(carouselDiv.hasChildNodes()) {
  carouselDiv.removeChild(carouselDiv.lastChild);
}

// pass faculty information to the <FacultyCarousel> component
ReactDOM.render(
  <FacultyCarousel faculty={faculty} />,
  carouselDiv
);

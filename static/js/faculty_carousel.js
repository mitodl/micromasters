// @flow
/* global SETTINGS:false */
import FacultyCarousel from './components/FacultyCarousel';
import React from 'react';
import ReactDOM from 'react-dom';

const carouselDiv = document.querySelector('#faculty-carousel');
ReactDOM.render(
  <FacultyCarousel faculty={SETTINGS.faculty} />,
  carouselDiv
);

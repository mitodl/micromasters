// @flow
/* global SETTINGS: false */
__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase
import FacultyCarousel from './components/FacultyCarousel';
import React from 'react';
import ReactDOM from 'react-dom';

const carouselDiv = document.querySelector('#faculty-carousel');
ReactDOM.render(
  <FacultyCarousel faculty={SETTINGS.faculty} />,
  carouselDiv
);

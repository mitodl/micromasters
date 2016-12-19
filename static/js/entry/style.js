__webpack_public_path__ = `http://${SETTINGS.host}:8078/`;  // eslint-disable-line no-undef, camelcase
// bootstrap
import 'style!css!bootstrap/dist/css/bootstrap.min.css';

// react-mdl material-design-lite file
import 'style!css!react-mdl/extra/material.css';
// react-virtualized requirement
import 'style!css!react-virtualized/styles.css';
import 'style!css!react-virtualized-select/styles.css';
import 'style!css!cropperjs/dist/cropper.css';

// react-select styles
import 'style!css!react-select/dist/react-select.css';
// react-slick styles
import 'style!css!slick-carousel/slick/slick.css';
import 'style!css!slick-carousel/slick/slick-theme.css';

// react-datepicker styles
import 'style!css!react-datepicker/dist/react-datepicker.css';

// react-geosuggest styles
import 'style!css!react-geosuggest/module/geosuggest.css';

// This should come last to override other styles
import '../../scss/layout.scss';

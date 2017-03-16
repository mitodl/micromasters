__webpack_public_path__ = `${SETTINGS.public_path}`;  // eslint-disable-line no-undef, camelcase

// material design lite (MDL)
import '../../scss/material-design-lite.scss';

// bootstrap
import 'style-loader!css-loader!bootstrap/dist/css/bootstrap.min.css';

// react-virtualized requirement
import 'style-loader!css-loader!react-virtualized/styles.css';
import 'style-loader!css-loader!react-virtualized-select/styles.css';
import 'style-loader!css-loader!cropperjs/dist/cropper.css';

// react-select styles
import 'style-loader!css-loader!react-select/dist/react-select.css';
// react-slick styles
import 'style-loader!css-loader!slick-carousel/slick/slick.css';
import 'style-loader!css-loader!slick-carousel/slick/slick-theme.css';

// react-datepicker styles
import 'style-loader!css-loader!react-datepicker/dist/react-datepicker.css';

// react-geosuggest styles
import 'style-loader!css-loader!react-geosuggest/module/geosuggest.css';

// react-telephone-input stylesheet
import 'style-loader!css-loader!react-telephone-input/css/default.css';

// This should come last to override other styles
import '../../scss/layout.scss';

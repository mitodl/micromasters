__webpack_public_path__ = `${SETTINGS.public_path}` // eslint-disable-line no-undef, camelcase
// bootstrap
import "style-loader!css-loader!bootstrap/dist/css/bootstrap.min.css"

// react-mdl material-design-lite file
import "style-loader!css-loader!react-mdl/extra/material.css"
// react-virtualized requirement
import "style-loader!css-loader!react-virtualized/styles.css"
import "style-loader!css-loader!react-virtualized-select/styles.css"
import "style-loader!css-loader!cropperjs/dist/cropper.css"

// react-select styles
import "style-loader!css-loader!react-select/dist/react-select.css"
// react-slick styles
import "style-loader!css-loader!slick-carousel/slick/slick.css"
import "style-loader!css-loader!slick-carousel/slick/slick-theme.css"

// react-datepicker styles
import "style-loader!css-loader!react-datepicker/dist/react-datepicker.css"

// react-geosuggest styles
import "style-loader!css-loader!react-geosuggest/module/geosuggest.css"

// react-telephone-input stylesheet
import "style-loader!css-loader!react-telephone-input/css/default.css"

import "style-loader!css-loader!react-draft-wysiwyg/dist/react-draft-wysiwyg.css"

// This should come last to override other styles
import "../../scss/layout.scss"

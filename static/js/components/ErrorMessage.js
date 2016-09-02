// @flow
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';

import type { APIErrorInfo } from '../flow/generalTypes';

export default class ErrorMessage extends React.Component {
  props: {
    errorInfo: APIErrorInfo,
  };

  render() {
    const {
      errorInfo: {
        error_code: errorCode,
        user_message: userMessage,
        detail,
        errorStatusCode,
      }
    } = this.props;

    let errorCodeStr = () => {
      if ( errorCode !== undefined ) {
        return `${errorCode} `;
      }
      if ( errorStatusCode !== undefined ) {
        return `${errorStatusCode} `;
      }
      return '';
    };

    let userMessageStr = () => {
      if ( userMessage !== undefined ) {
        return `Additional info: ${userMessage}`;
      }
      if ( detail !== undefined ) {
        return `Additional info: ${detail}`;
      }
      return '';
    };

    return (
      <div className="alert-message">
        <Alert bsStyle="danger">
          <p>{ errorCodeStr() }Sorry, we were unable to load the data necessary to
          process your request. Please reload the page.</p>
          <p>{ userMessageStr() }</p>
          <p>
            If the error persists, please contact <a href="mailto:mitx-support@mit.edu">
            mitx-support@mit.edu</a> specifying
            this entire error message.
          </p>
        </Alert>
      </div>
    );
  }
}

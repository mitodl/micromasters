// @flow
import React from 'react';
import Spinner from 'react-mdl/lib/Spinner';

export default class Loader extends React.Component {
  props: {
    loaded: boolean,
    children?: React$Element<*>[],
  };

  render() {
    const { loaded, children } = this.props;

    let content;
    if (loaded) {
      content = children;
    } else {
      content = <div className="loader">
        <Spinner singleColor />
      </div>;
    }

    return <div>
      {content}
    </div>;
  }
}

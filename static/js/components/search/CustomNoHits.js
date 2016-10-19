// @flow
import React from 'react';
import { NoHits } from 'searchkit';

export default class CustomNoHits extends NoHits {
  render() {
    if ((this.hasHits() || this.isInitialLoading() || this.isLoading()) && !this.getError()) {
      return null;
    }

    return (
      <div className="no-hits">
        There are no results for your search.
      </div>
    );
  }
}

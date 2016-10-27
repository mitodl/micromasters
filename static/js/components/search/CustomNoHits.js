// @flow
import React from 'react';
import { NoHits } from 'searchkit';

export default class CustomNoHits extends NoHits {
  render() {
    if ((this.hasHits() || this.isInitialLoading() || this.isLoading()) && !this.getError()) {
      return null;
    }

    if (this.getError()) {
      const suggestion = this.getSuggestion();
      const query = this.getQuery().getQueryString();
      let infoKey = suggestion ? "NoHits.NoResultsFoundDidYouMean" : "NoHits.NoResultsFound";

      if (query) {
        return (
          <div className="no-hits">
            {this.translate(infoKey, {query:query, suggestion:suggestion})}
          </div>
        );
      }
    }

    return (
      <div className="no-hits">
        There are no results for this search.
      </div>
    );
  }
}

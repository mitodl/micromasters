// @flow
import React from 'react';
import { NoHits } from 'searchkit';

export default class CustomNoHits extends NoHits {
  render() {
    let message;

    if ((this.hasHits() || this.isInitialLoading() || this.isLoading()) && !this.getError()) {
      return null;
    }

    if (this.getError()) {
      if (this.getError().data && this.getError().data.detail) {
        message = this.getError().data.detail;
      } else {
        message = this.translate("NoHits.Error");
      }
    } else {
      const suggestion = this.getSuggestion();
      const query = this.getQuery().getQueryString();
      let infoKey = suggestion ? "NoHits.NoResultsFoundDidYouMean" : "NoHits.NoResultsFound";
      message = this.translate(infoKey, {query: query, suggestion: suggestion});
    }

    return (
      <div className="no-hits">
        { message }
      </div>
    );
  }
}

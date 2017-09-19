// @flow
import React from "react"
import { NoHits } from "searchkit"

export default class CustomNoHits extends NoHits {
  render() {
    let message =
      "There were no results found for this search. Please remove some filters or start over."

    if (
      (this.hasHits() || this.isInitialLoading() || this.isLoading()) &&
      !this.getError()
    ) {
      return null
    }

    if (this.getError()) {
      if (this.getError().data && this.getError().data.detail) {
        message = this.getError().data.detail
      }
    }

    return <div className="no-hits">{message}</div>
  }
}

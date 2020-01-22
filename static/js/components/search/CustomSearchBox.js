// @flow
import { SearchBox } from "searchkit"
import * as React from "react"

export default class CustomSearchBox extends SearchBox {
  render() {
    // override SearchBox.render to fix console warning
    const block = this.bemBlocks.container

    return (
      <div className={block().state({ focused: this.state.focused })}>
        <form onSubmit={this.onSubmit.bind(this)}>
          <div className={block("icon")} />
          <input
            type="text"
            data-qa="query"
            className={block("text")}
            placeholder={
              this.props.placeholder || this.translate("searchbox.placeholder")
            }
            value={this.getValue()}
            onFocus={this.setFocusState.bind(this, true)}
            onBlur={this.setFocusState.bind(this, false)}
            // eslint-disable-next-line
            ref="queryField"
            autoFocus={this.props.autofocus}
            // This line changed to specify onChange instead of onInput to fix console warning.
            // Both appear to be interchangable other than the console warning
            // https://stackoverflow.com/questions/38256332/in-react-whats-the-difference-between-onchange-and-oninput
            onChange={this.onChange.bind(this)}
          />
          <input
            type="submit"
            value={this.translate("searchbox.button")}
            className={block("action")}
            data-qa="submit"
          />
          <div
            data-qa="loader"
            className={block("loader")
              .mix("sk-spinning-loader")
              .state({ hidden: !this.isLoading() })}
          />
        </form>
      </div>
    )
  }
}

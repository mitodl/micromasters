import React from 'react';
import ReactDOM from 'react-dom';
import { Select } from 'searchkit';
import block from 'bem-cn';

import type { Event } from '../../flow/eventType';

export default class CustomSortingSelect extends Select {
  showDropdown(sortSelectField: string, clickEvent: Event): void {
    clickEvent.preventDefault();
    let event: Event = document.createEvent('MouseEvents');
    event.initMouseEvent('mousedown', true, true, window);
    ReactDOM.findDOMNode(sortSelectField).dispatchEvent(event);
  }

  renderOptions(
    translate: Function,
    showCount: number,
    countFormatter: Function,
    items: Array<Object>
  ): Array<React$Element<*>> {
    return items.map(item => {
      let text = translate(item.label || item.title || item.key);
      if (showCount && item.docCount !== undefined) {
        text += ` (${countFormatter(item.docCount)})`;
      }

      return <option key={item.key} value={item.key} disable={item.disabled}>
        { text }
      </option>;
    });
  }

  render() {
    const {
      mod,
      className,
      items,
      disabled,
      showCount,
      translate,
      countFormatter
    } = this.props;
    const bemBlocks = { container: block(mod) };

    return (
      <div className={bemBlocks.container().mix(className).state({ disabled }) }>
        <span className="label-before-selected"
          onClick={this.showDropdown.bind(null, this.refs.sortSelectField)}>
          Sort by:
        </span>
        <select onChange={this.onChange} value={this.getSelectedValue()} ref="sortSelectField">
          {this.renderOptions(translate, showCount, countFormatter, items)}
        </select>
      </div>
    );
  }
}

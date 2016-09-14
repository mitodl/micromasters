import React from 'react';
import ReactDOM from 'react-dom';
import { Select } from 'searchkit';
import _ from 'lodash';
import block from 'bem-cn';

import type { Event } from '../../flow/eventType';

export default class CustomSortingSelect extends Select {

  showDropdown(sortSelectField: string, clickEvent: Event): void {
    clickEvent.preventDefault();
    let event: Event = document.createEvent('MouseEvents');
    event.initMouseEvent('mousedown', true, true, window);
    ReactDOM.findDOMNode(sortSelectField).dispatchEvent(event);
  }

  render() {
    const {
      mod, className, items, disabled, showCount, translate, countFormatter
    } = this.props;
    const bemBlocks = { container: block(mod) };

    return (
      <div className={bemBlocks.container().mix(className).state({ disabled }) }>
        <span className="label-before-selected"
          onClick={this.showDropdown.bind(null, this.refs.sortSelectField)}>
          Sort by:
        </span>
        <select onChange={this.onChange} value={this.getSelectedValue()} ref="sortSelectField">
          {_.map(items, ({key, label, title, disabled, docCount}) => {
            let text = translate(label || title || key);

            if (showCount && docCount !== undefined) {
              text += ` (${countFormatter(docCount)})`;
            }

            return (
              <option key={key} value={key} disabled={disabled}>
                {text}
              </option>
            );
          })};
        </select>
      </div>
    );
  }
}

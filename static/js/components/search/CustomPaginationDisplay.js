// @flow
import React from 'react';
import Icon from 'react-mdl/lib/Icon';
import type { Event, EventTarget } from '../../flow/eventType';

export default class CustomPaginationDisplay extends React.Component {
  props: {
    disabled:   boolean,
    toggleItem: Function,
  };

  onClick(toggleItem: Function, evt: Event): void {
    evt.preventDefault();
    let target: EventTarget = evt.target;
    let key = target.getAttribute("data-key");
    toggleItem(key);
  }

  render() {
    const { toggleItem, disabled } = this.props;
    let optionsNext, optionsPrev;

    if (!disabled) {
      optionsPrev = (
        <div className="sk-toggle-option sk-toggle__item sk-pagination-option"
          data-qa="option" data-key="previous" onClick={this.onClick.bind(null, toggleItem)}>
          <Icon name="navigate_before" data-key="previous" />
        </div>
      );
      optionsNext = (
        <div className="sk-toggle-option sk-toggle__item sk-pagination-option"
          data-qa="option" data-key="next" onClick={this.onClick.bind(null, toggleItem)}>
          <Icon name="navigate_next" data-key="next" />
        </div>
      );
    }

    return (
      <div data-qa="options" className="sk-toggle sk-toggle-height">
        {optionsPrev}{optionsNext}
      </div>
    );
  }
}

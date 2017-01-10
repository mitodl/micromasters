// @flow
import React from 'react';
import { codeToCountryName } from '../../lib/currency';

export default class CountryRefinementOption extends React.Component {
  props: {
    label:    string,
    active:   boolean,
    onClick:  Function,
    count:    number,
  };

  render () {
    const { active, onClick, count, label } = this.props;
    let activeClass = () => active ? "is-active" : "";
    let option = "sk-item-list-option";
    return (
      <div className={`${option} sk-item-list__item ${activeClass()}`} onClick={onClick}>
        <input
          type="checkbox"
          data-qa="checkbox"
          checked={active}
          readOnly
          className={`${option} checkbox`}
        >
        </input>
        <div className={`${option}__text`}>
          { codeToCountryName(label) }
        </div>
        <div className={`${option}__count`}>
          { count }
        </div>
      </div>
    );
  }
}

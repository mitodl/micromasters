// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';

import CustomPaginationDisplay from './CustomPaginationDisplay';

describe('CustomPaginationDisplay', () => {
  let toggleItemStub = sinon.stub();
  let props = {
    disabled: false,
    toggleItem: toggleItemStub
  };

  afterEach(() => {
    toggleItemStub.reset();
  });

  it('renders custom pagination buttons', () => {
    const wrapper = shallow(<CustomPaginationDisplay {...props}/>);
    const previousOption = wrapper.find('[data-key="previous"]');
    const nextOption = wrapper.find('[data-key="next"]');

    assert.isAbove(previousOption.length, 0);
    assert.isAbove(nextOption.length, 0);
    assert.equal(previousOption.first().text(), '<Icon />');
    assert.equal(nextOption.first().text(), '<Icon />');
  });

  it('toggleItem called on previous option click', () => {
    const wrapper = shallow(<CustomPaginationDisplay {...props}/>);
    const previousOption = wrapper.find('[data-key="previous"]');
    let event = {
      preventDefault: (): void => {},
      target: {
        getAttribute: (): string => { return 'previous'; }
      }
    };

    previousOption.at(0).simulate('click', event, toggleItemStub);
    assert(toggleItemStub.called, "toggleItem handler wasn't called");
  });

  it('toggleItem called on next option click', () => {
    const wrapper = shallow(<CustomPaginationDisplay {...props}/>);
    const nextOption = wrapper.find('[data-key="next"]');
    let event = {
      preventDefault: (): void => {},
      target: {
        getAttribute: (): string => { return 'next'; }
      }
    };

    nextOption.at(0).simulate('click', event, toggleItemStub);
    assert(toggleItemStub.called, "toggleItem handler wasn't called");
  });
});

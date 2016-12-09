// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import Button from 'react-mdl/lib/Button';

import SpinnerButton from './SpinnerButton';

describe("SpinnerButton", () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('passes through all props when spinning is false', () => {
    let onClick = sandbox.stub();
    let props = {
      "data-x": "y",
      onClick: onClick,
      className: "class1 class2"
    };
    let wrapper = shallow(<SpinnerButton
      component="button"
      spinning={false}
      {...props}
    >
      childText
    </SpinnerButton>);
    let button = wrapper.find("button");
    let buttonProps = button.props();
    for (let key of Object.keys(props)) {
      assert.deepEqual(buttonProps[key], props[key]);
    }
    assert.equal(button.children().text(), "childText");
    assert.isUndefined(buttonProps.disabled);
  });

  it('replaces children with a Spinner, disables onClick and updates className when spinning is true', () => {
    let onClick = sandbox.stub();
    let props = {
      disabled: true,
      "data-x": "y",
    };
    let wrapper = shallow(<SpinnerButton
      component={Button}
      spinning={true}
      onClick={onClick}
      className="class1 class2"
      {...props}
    />);
    let button = wrapper.find("Button");
    let buttonProps = button.props();
    for (let key of Object.keys(props)) {
      assert.deepEqual(buttonProps[key], props[key]);
    }

    assert.isUndefined(buttonProps.onClick);
    assert.equal(buttonProps.className, "class1 class2 disabled-with-spinner");
    assert.isTrue(buttonProps.disabled);
    assert.equal(button.children().text(), "<Spinner />");
  });
});

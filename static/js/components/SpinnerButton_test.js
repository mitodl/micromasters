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
      if (key !== 'onClick') {
        assert.deepEqual(buttonProps[key], props[key]);
      }
    }
    assert.equal(button.children().text(), "childText");
    assert.isUndefined(buttonProps.disabled);
  });

  it('replaces children with a Spinner, disables onClick and updates className when spinning is true', () => {
    let onClick = sandbox.stub();
    let props = {
      "data-x": "y",
    };
    let wrapper = shallow(<SpinnerButton
      component={Button}
      spinning={true}
      onClick={onClick}
      className="class1 class2"
      {...props}
    >
      text
    </SpinnerButton>);
    wrapper.setState({
      recentlyClicked: true
    });
    let button = wrapper.find("Button");
    let buttonProps = button.props();
    for (let key of Object.keys(props)) {
      assert.deepEqual(buttonProps[key], props[key]);
    }

    assert.isUndefined(buttonProps.onClick);
    assert.equal(buttonProps.className, "class1 class2 disabled-with-spinner");
    assert.equal(buttonProps['data-x'], 'y');
    assert.isTrue(buttonProps.disabled);
    assert.equal(button.children().text(), "<Spinner />");
  });

  it("does not show the spinner when it's disabled", () => {
    let wrapper = shallow(<SpinnerButton
      disabled={true}
      spinning={true}
      onClick={sandbox.stub()}
      component="button"
    >
      text
    </SpinnerButton>);
    let buttonProps = wrapper.find("button").props();

    assert.equal(buttonProps.className, undefined);
    assert.isTrue(buttonProps.disabled);
    assert.equal(buttonProps.onClick, undefined);
    assert.equal("text", wrapper.find("button").text());
  });

  it('sets recentlyClicked to true when the button is clicked', () => {
    let onClick = sandbox.stub();
    let wrapper = shallow(
      <SpinnerButton
        component="button"
        onClick={onClick}
        spinning={false}
      />
    );
    assert.isFalse(wrapper.state().recentlyClicked);
    let buttonProps = wrapper.find("button").props();
    buttonProps.onClick("args");
    assert.isTrue(onClick.calledWith("args"));
    assert.isTrue(wrapper.state().recentlyClicked);
  });

  it('does not show the spinner if spinning is true but recentlyClicked is false', () => {
    let onClick = sandbox.stub();
    let wrapper = shallow(
      <SpinnerButton
        spinning={true}
        component="button"
        onClick={onClick}
      >
        text
      </SpinnerButton>
    );
    let buttonProps = wrapper.find("button").props();
    assert.equal(buttonProps.className, undefined);
    assert.isTrue(buttonProps.disabled);
    assert.equal(buttonProps.onClick, undefined);
    assert.equal("text", wrapper.find("button").text());
  });

  it('sets recentlyClicked back to false if the spinning prop changes back to false', () => {
    let wrapper = shallow(
      <SpinnerButton
        component="button"
        spinning={true}
      />
    );
    wrapper.setState({
      recentlyClicked: true
    });
    wrapper.setProps({
      spinning: false
    });
    assert.isFalse(wrapper.state().recentlyClicked);
  });
});

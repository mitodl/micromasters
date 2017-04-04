// @flow
import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { assert } from 'chai';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

import {
  ONE_TIME_EMAIL,
  EMAIL_CAMPAIGN
} from './constants';
import AutomaticEmailOptions from './AutomaticEmailOptions';

describe('AutomaticEmailOptions', () => {
  let sandbox, setEmailCompositionTypeStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    setEmailCompositionTypeStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderComponent = (automaticEmailType: string = ONE_TIME_EMAIL) => (
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <AutomaticEmailOptions
          setAutomaticEmailType={setEmailCompositionTypeStub}
          automaticEmailType={automaticEmailType}
        />
      </MuiThemeProvider>
    )
  );

  it('div renders', () => {
    let wrapper = renderComponent(ONE_TIME_EMAIL);
    assert.equal(wrapper.find(".type-radio-group").children().length, 2);
  });

  it(`div renders for type: ${ONE_TIME_EMAIL}`, () => {
    let wrapper = renderComponent(ONE_TIME_EMAIL);
    assert.equal(wrapper.find(".type-radio-group").children().length, 2);
    // test setEmailCompositionType is called when one time email selected
    let radioOneTime = wrapper.find(".one-time-email input");
    radioOneTime.simulate('change');
    assert.isTrue(setEmailCompositionTypeStub.called, "called set email composition type handler");
  });

  it(`div renders for type: ${EMAIL_CAMPAIGN}`, () => {
    let wrapper = renderComponent(EMAIL_CAMPAIGN);
    assert.equal(wrapper.find(".type-radio-group").children().length, 2);
    assert.include(
      wrapper.text(),
      'This email will be sent now and in the future whenever users meet the criteria.'
    );
    // test setEmailCompositionType is called when campaign selected
    let radioCampaign = wrapper.find(".email-campaign input");
    radioCampaign.simulate('change');
    assert.isTrue(setEmailCompositionTypeStub.called, "called set email composition type handler");
  });
});

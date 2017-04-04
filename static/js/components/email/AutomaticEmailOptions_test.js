// @flow
import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { assert } from 'chai';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

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

  const renderComponent = (sendAutomaticEmails: boolean = false) => (
    mount(
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <AutomaticEmailOptions
          setSendAutomaticEmails={setEmailCompositionTypeStub}
          sendAutomaticEmails={sendAutomaticEmails}
        />
      </MuiThemeProvider>
    )
  );

  it('div renders', () => {
    let wrapper = renderComponent();
    assert.equal(wrapper.find(".type-radio-group").children().length, 2);
  });

  it('div renders for type: one time email', () => {
    let wrapper = renderComponent();
    assert.equal(wrapper.find(".type-radio-group").children().length, 2);
    // test setEmailCompositionType is called when one time email selected
    let radioOneTime = wrapper.find(".one-time-email input");
    radioOneTime.simulate('change');
    assert.isTrue(setEmailCompositionTypeStub.called, "called set email composition type handler");
  });

  it('div renders for type: email campaign', () => {
    let wrapper = renderComponent(true);
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

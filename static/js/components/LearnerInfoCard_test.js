// @flow
/* global SETTINGS */
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';

import LearnerInfoCard from './LearnerInfoCard';
import { USER_PROFILE_RESPONSE } from '../test_constants';
import { mstr } from '../lib/sanctuary';
import {
  getEmployer,
  getPreferredName,
} from '../util/util';

describe('LearnerInfoCard', () => {
  let sandbox, editProfileBtnStub, editAboutMeBtnStub;

  const renderInfoCard = (props = {}) => (
    shallow(<LearnerInfoCard
      profile={ USER_PROFILE_RESPONSE }
      toggleShowPersonalDialog={ editProfileBtnStub }
      toggleShowAboutMeDialog={ editAboutMeBtnStub }
      {...props}
    />)
  );

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    editProfileBtnStub = sandbox.stub();
    editAboutMeBtnStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('render user info card', () => {
    let wrapper = renderInfoCard();
    assert.equal(wrapper.find(".profile-title").text(), getPreferredName(USER_PROFILE_RESPONSE));
    assert.equal(wrapper.find(".profile-company-name").text(), mstr(getEmployer(USER_PROFILE_RESPONSE)));
    assert.equal(wrapper.find("h3").text(), 'About Me');
    assert.equal(
      wrapper.find(".bio .placeholder").text(),
      'Write something about yourself, so others can learn a bit about you.'
    );
  });

  it('edit profile works', () => {
    let wrapper = renderInfoCard();
    let editProfileButton = wrapper.find(".edit-profile-holder").childAt(0);
    editProfileButton.simulate('click');
    assert.equal(editProfileBtnStub.callCount, 1);
  });

  it('edit about me works', () => {
    let wrapper = renderInfoCard();
    let editAboutMeButton = wrapper.find(".edit-about-me-holder").childAt(0);
    editAboutMeButton.simulate('click');
    assert.equal(editAboutMeBtnStub.callCount, 1);
  });

  it('edit about me is not available for other users is ', () => {
    let wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        username: "xyz"
      }
    });
    assert.equal(wrapper.find(".edit-about-me-holder").children().length, 0);
  });

  it('set about me', () => {
    let wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        about_me: "Hello world"
      }
    });
    assert.equal(wrapper.find("h3").text(), 'About Me');
    assert.equal(
      wrapper.find(".bio").text(),
      "Hello world"
    );
  });

  it('check multilines works me', () => {
    let wrapper = renderInfoCard({
      profile: {
        ...USER_PROFILE_RESPONSE,
        about_me: "Hello \n world"
      }
    });
    assert.equal(
      wrapper.find(".bio").html(),
      '<div class="bio">Hello \n world</div>'
    );
  });

  it('should show email if user is viewing not their own profile', () => {
    SETTINGS.user.username = "My user";
    let chip = renderInfoCard();
    assert.equal(chip.find(".profile-email").text(), USER_PROFILE_RESPONSE.email);
  });

  it('should not show email if user is viewing their own profile', () => {
    let chip = renderInfoCard();
    assert(chip.find(".profile-email").isEmpty(), 'email is shown');
  });
});

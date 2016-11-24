// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';
import _ from 'lodash';

import UserInfoCard from './UserInfoCard';
import { USER_PROFILE_RESPONSE } from '../constants';
import { mstr } from '../lib/sanctuary';
import {
  getEmployer,
  getPreferredName,
} from '../util/util';

describe('UserInfoCard', () => {
  let sandbox, defaultRowProps, editProfileBtnStub, editAboutMeBtnStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    editProfileBtnStub = sandbox.stub();
    editAboutMeBtnStub = sandbox.stub();

    defaultRowProps = {
      profile: USER_PROFILE_RESPONSE,
      toggleShowPersonalDialog: editProfileBtnStub,
      toggleShowAboutMeDialog: editAboutMeBtnStub
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('render user info card', () => {
    let wrapper = shallow(<UserInfoCard {...defaultRowProps} />);
    assert.equal(wrapper.find(".profile-title").text(), getPreferredName(USER_PROFILE_RESPONSE));
    assert.equal(wrapper.find(".profile-company-name").text(), mstr(getEmployer(USER_PROFILE_RESPONSE)));
    assert.equal(wrapper.find(".profile-email").text(), USER_PROFILE_RESPONSE.email);
    assert.equal(wrapper.find(".heading").text(), 'About Me');
    assert.equal(
      wrapper.find(".bio .placeholder").text(),
      'Write something about yourself, so your classmates can learn a bit about you.'
    );
  });

  it('edit prifile works', () => {
    let wrapper = shallow(<UserInfoCard {...defaultRowProps} />);
    let editProfileButton = wrapper.find(".edit-profile-holder").childAt(0);
    editProfileButton.simulate('click');
    assert.isAbove(editProfileBtnStub.callCount, 0);
  });

  it('edit about me works', () => {
    let wrapper = shallow(<UserInfoCard {...defaultRowProps} />);
    let editAboutMeButton = wrapper.find(".edit-about-me-holder").childAt(0);
    editAboutMeButton.simulate('click');
    assert.isAbove(editAboutMeBtnStub.callCount, 0);
  });

  it('set about me', () => {
    defaultRowProps['profile'] = Object.assign(_.cloneDeep(USER_PROFILE_RESPONSE), {
      about_me: "Hello world"
    });
    let wrapper = shallow(<UserInfoCard {...defaultRowProps} />);
    assert.equal(wrapper.find(".heading").text(), 'About Me');
    assert.equal(
      wrapper.find(".bio").text(),
      "Hello world"
    );
  });
});

// @flow
import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import { CardTitle } from 'react-mdl/lib/Card';
import Link from 'react-router/lib/Link';

import ProfileImage from '../../containers/ProfileImage';
import { DASHBOARD_RESPONSE, USER_PROFILE_RESPONSE } from '../../constants';
import DashboardUserCard from './DashboardUserCard';

describe('DashboardUserCard', () => {
  it('renders a user card', () => {
    const program = DASHBOARD_RESPONSE[1];
    const profile = USER_PROFILE_RESPONSE;
    let wrapper = shallow(<DashboardUserCard profile={profile} program={program} />);
    assert.equal(wrapper.find(".dashboard-user-card-image").find(ProfileImage).props().profile, profile);
    let textContainer = wrapper.find(".dashboard-user-card-text");
    assert.equal(textContainer.find(CardTitle).children().text(), "Jane Garris");

    assert.equal(textContainer.find(".dashboard-user-card-text-program").text(), program.title);
    assert.equal(
      textContainer.find(".dashboard-user-card-text-id").text(),
      `MicroMasters ID: ${profile.pretty_printed_student_id}`,
    );
    let link = textContainer.find(Link);
    assert.deepEqual(link.children().text(), 'View Profile');
    assert.deepEqual(link.props().to, `/users/${profile.username}`);
  });

  it('shows no title if no program is present', () => {
    let wrapper = shallow(<DashboardUserCard profile={USER_PROFILE_RESPONSE} program={undefined} />);
    assert.equal(wrapper.find(".dashboard-user-card-text-program").text(), "");
  });
});

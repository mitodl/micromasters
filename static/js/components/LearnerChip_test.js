import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';

import { USER_PROFILE_RESPONSE } from '../test_constants';
import R from 'ramda';
import LearnerChip from './LearnerChip';
import { getPreferredName } from '../util/util';
import ProfileImage from '../containers/ProfileImage';

describe('LearnerChip', () => {
  let clone;

  const renderChip = profile => (
    shallow(<LearnerChip profile={profile} />)
  );

  beforeEach(() => {
    clone = R.clone(USER_PROFILE_RESPONSE);
  });

  it('should show the preferred name', () => {
    let chip = renderChip(clone);
    assert.equal(chip.find('.name').text(), getPreferredName(clone));
  });

  it('should show the employer, if present', () => {
    let chip = renderChip(clone);
    assert.equal(chip.find('.employer').text(), "Planet Express");
  });

  it('should leave employer blank, if absent', () => {
    clone.work_history = [];
    let chip = renderChip(clone);
    assert.equal(chip.find('.employer').text(), "");
  });

  it('should link to the profile', () => {
    let chip = renderChip(clone);
    let url = chip.find('a').props().href;
    assert.equal(url, `/learner/${clone.username}`);
  });

  it('should include the profile image', () => {
    let chip = renderChip(clone);
    assert(
      chip.containsMatchingElement(<ProfileImage />),
      "chip should contain a ProfileImage component"
    );
  });
});

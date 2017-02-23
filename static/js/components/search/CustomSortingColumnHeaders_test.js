import React from 'react';
import { shallow } from 'enzyme';
import { assert } from 'chai';
import sinon from 'sinon';

import CustomSortingColumnHeaders from './CustomSortingColumnHeaders';
import { sortOptions } from '../../components/LearnerSearch';

describe('CustomSortingSelect', () => {
  let sandbox, setItemsStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    setItemsStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const renderSelect = (props = {}) => {
    return shallow(
      <CustomSortingColumnHeaders
        items={sortOptions}
        setItems={setItemsStub}
        selectedItems={null}
        {...props}
      />
    );
  };

  it('shows a up or down unicode arrow depending on the selected item key', () => {
    for (const [key, description, arrow] of [
      ['name_a_z', 'Name', '▲'],
      ['name_z_a', 'Name', '▼'],
      ['loc-a-z', 'Residence', '▲'],
      ['loc-z-a', 'Residence', '▼'],
      ['grade-high-low', 'Program grade', '▼'],
      ['grade-low-high', 'Program grade', '▲'],
      ['other', 'Program grade', ''],
    ]) {
      let wrapper = renderSelect({
        selectedItems: [key]
      });
      let lookup = {
        'Name': wrapper.find(".name"),
        'Residence': wrapper.find('.residence'),
        'Program grade': wrapper.find('.grade'),
      };
      assert.isTrue(lookup[description].html().includes(`${description} ${arrow}`));

      // assert that it's only selected when it needs to be
      assert.equal(lookup[description].props()['className'].includes('selected'), Boolean(arrow));
    }
  });

  it('chooses the first sorting key when the column is clicked', () => {
    let wrapper = renderSelect();
    wrapper.find(".name").simulate('click');
    assert.isTrue(setItemsStub.calledWith(['name_a_z']));
  });

  it('chooses the second sorting key if the first sorting key is already selected', () => {
    let wrapper = renderSelect({
      selectedItems: ['name_a_z']
    });
    wrapper.find(".name").simulate('click');
    assert.isTrue(setItemsStub.calledWith(['name_z_a']));
  });
});

import { assert } from 'chai';

import { codeToCountryName } from './location';

describe('location', () => {
  describe('codeToCountryName', () => {
    it('should return a valid country name for a code', () => {
      [
        ['US', 'United States'],
        [null, ''],
      ].forEach(([countryCode, country]) => {
        assert.equal(codeToCountryName(countryCode), country);
      });
    });
  });
});

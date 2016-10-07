import { assert } from 'chai';

import { currencyForCountry } from './currency';

describe('currency', () => {
  describe('currencyForCountry', () => {
    it('should return a valid currency code for a country', () => {
      [
        ['US', 'USD'],
        ['AF', 'AFN'],
        ['JP', 'JPY'],
        ['FR', 'EUR'],
        ['GB', 'GBP'],
        ['IN', 'INR'],
      ].forEach(([country, currency]) => {
        assert.equal(currencyForCountry(country), currency);
      });
    });

    it('should return an empty string if you give it nonsense', () => {
      assert.equal('', currencyForCountry('asdfasdf'));
    });

    it('should return an empty string if a country does not have a currency listing', () => {
      assert.equal('', currencyForCountry('PS'));
    });
  });
});

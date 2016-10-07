// @flow
import cc from 'currency-codes';
import R from 'ramda';
import iso3166 from 'iso-3166-2';

export const excludedCurrencyCodes = [
  'BOV',
  'CHE',
  'CHW',
  'COU',
  'MXV',
  'SSP',
  'USN',
  'USS',
  'UYI',
  'XBA',
  'XBB',
  'XBC',
  'XBD',
  'XBT',
  'XFU',
  'XTS',
  'XXX'
];

const codeToOption = code => (
  { value: code, label: cc.code(code).currency }
);

const labelSort = R.sortBy(R.compose(R.toLower, R.prop('label')));

const invalidCurrency = R.flip(R.contains)(excludedCurrencyCodes);

const codesToOptions = R.compose(
  labelSort, R.map(codeToOption), R.reject(invalidCurrency)
);

export const currencyOptions = codesToOptions(cc.codes());

const codeToCountryName = code => iso3166.country(code).name || '';

const currencyToCode = currency => (
  currency.length === 0 ? '' : currency[0].code
);

const excludeSingleCode = code => invalidCurrency(code) ? '' : code;

export const currencyForCountry = R.compose(
  excludeSingleCode, currencyToCode, cc.country, R.toLower, codeToCountryName
);

// @flow
import cc from 'currency-codes';
import R from 'ramda';
import iso3166 from 'iso-3166-2';

const codeToOption = code => (
  { value: code, label: cc.code(code).currency }
);

const labelSort = R.sortBy(R.compose(R.toLower, R.prop('label')));

const excludeUnusedCodes = R.reject(R.flip(R.contains)(['USS', 'USN']));

const codesToOptions = R.compose(
  labelSort, R.map(codeToOption), excludeUnusedCodes
);

export const currencyOptions = codesToOptions(cc.codes());

const codeToCountryName = code => iso3166.country(code).name;

const countryNameToCurrency = name => cc.country(name)[0].code;

export const currencyForCountry = R.compose(
  countryNameToCurrency, R.toLower, codeToCountryName
);

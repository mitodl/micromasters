// @flow
import cc from 'currency-codes';
import R from 'ramda';

const codeToOption = code => (
  { value: code, label: cc.code(code).currency }
);

const labelSort = R.sortBy(R.compose(R.toLower, R.prop('label')));

const excludeUnusedCodes = R.reject(R.flip(R.contains)(['USS', 'USN']));

const codesToOptions = R.compose(
  labelSort, R.map(codeToOption), excludeUnusedCodes
);

export const currencyOptions = codesToOptions(cc.codes());

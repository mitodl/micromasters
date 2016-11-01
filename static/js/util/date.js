// @flow
import R from 'ramda';
import moment from 'moment';

import { DASHBOARD_MONTH_FORMAT } from '../constants';

export const ifValidDate = R.curry((defaultValue, fn, date) => (
  date.isValid() ? fn(date) : defaultValue
));

export const formatMonthDate = (date: ?string): string => {
  if (date) {
    return moment(date).format(DASHBOARD_MONTH_FORMAT);
  } else {
    return '';
  }
};

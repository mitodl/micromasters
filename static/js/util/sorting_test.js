// @flow
import { assert } from 'chai';
import moment from 'moment';

import {
  dateOrderDesc,
  workEntriesByDate,
  educationEntriesByDate,
  momentCompareDesc,
} from './sorting';
import { generateNewWorkHistory, generateNewEducation } from './util';
import { HIGH_SCHOOL } from '../constants';

let format = 'YYYY-MM';

describe('sorting functions', () => {
  describe('momentCompareDesc', () => {
    it('should sort arrays of moment objects in descending order', () => {
      let moments = [
        moment('1987-12', 'YYYY-MM'),
        moment('1986-12', 'YYYY-MM'),
        moment('1987-09', 'YYYY-MM'),
        moment('1901-03', 'YYYY-MM'),
        moment('2001-04', 'YYYY-MM'),
        moment('2016-12', 'YYYY-MM'),
      ];
      moments.sort(momentCompareDesc);
      let expected = [
        '2016-12',
        '2001-04',
        '1987-12',
        '1987-09',
        '1986-12',
        '1901-03',
      ];
      assert.deepEqual(expected, moments.map(m => m.format('YYYY-MM')));
    });
  });

  describe('dateOrderDesc', () => {
    let entries = ['1969-01', '1997-01', '1992-01', '1934-01'].map(year => (
      { 'end_date': moment(year, format).format(format) }
    ));
    let sorted = dateOrderDesc(entries.map((entry, index) => (
      [index, entry]
    )), 'end_date');
    let expected = [
      '1997-01',
      '1992-01',
      '1969-01',
      '1934-01',
    ];

    it('should sort by date, descending', () => {
      assert.deepEqual(expected, sorted.map(([,entry]) => entry.end_date));
    });

    it('should not modify the original array', () => {
      assert.notDeepEqual(entries, sorted);
    });

    it('should return the indices of the objects in the original array', () => {
      sorted.forEach(([index, entry]) => {
        assert.deepEqual(entries[index], entry);
      });
    });
  });

  describe('workEntriesByDate', () => {
    let entries = [
      ['1962-12', null],
      ['1923-12', null],
      ['2001-01', '2012-03'],
      ['1962-12', '1963-11'],
      ['1961-08', '1982-01'],
      ['2001-12', null],
    ].map(([start, end]) => {
      let entry = generateNewWorkHistory();
      entry.start_date = moment(start, format).format(format);
      entry.end_date = end ? moment(end, format).format(format) : null;
      return entry;
    });
    let sorted = workEntriesByDate(entries);

    it('should sort employment entries first by "current" and then by date descending (resume order)', () => {
      // null end date (current position) jobs come first
      sorted.slice(0, 3).forEach(([,entry]) => (
        assert.isNull(entry.end_date)
      ));

      // finished (non-current) jobs at the end
      sorted.slice(3,6).forEach(([,entry]) => (
        assert.isNotNull(entry.end_date)
      ));

      // check overall date order
      let expectedDateOrder = [
        ['2001-12', null],
        ['1962-12', null],
        ['1923-12', null],
        ['2001-01', '2012-03'],
        ['1961-08', '1982-01'],
        ['1962-12', '1963-11'],
      ];
      let actualDateOrder = sorted.map(([,entry]) => ([
        entry.start_date,
        entry.end_date
      ]));
      assert.deepEqual(expectedDateOrder, actualDateOrder);
    });

    it('should return the indices of the sorted entries in the original array', () => {
      sorted.forEach(([index, entry]) => {
        assert.deepEqual(entry, entries[index]);
      });
    });
  });

  describe('educationEntriesByDate', () => {
    let entries = [
      '1979-12',
      '1923-12',
      '2001-01',
      '1962-12',
      '1961-08',
      '2001-12',
    ].map(date => {
      let entry = generateNewEducation(HIGH_SCHOOL);
      entry.graduation_date = moment(date, format).format(format);
      return entry;
    });
    let sorted = educationEntriesByDate(entries);

    let expectation = [
      '2001-12',
      '2001-01',
      '1979-12',
      '1962-12',
      '1961-08',
      '1923-12',
    ];

    it('should sort education entries by date descending', () => {
      assert.deepEqual(expectation, sorted.map(([,e]) => e.graduation_date));
    });

    it('should return the indices of the sorted entries in the original array', () => {
      sorted.forEach(([index, entry]) => {
        assert.deepEqual(entry, entries[index]);
      });
    });
  });
});

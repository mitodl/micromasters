// @flow
import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import R from 'ramda';
import TextField from 'material-ui/TextField';
import { S, mstr, allJust } from '../../lib/sanctuary';
const { Maybe } = S;

import { ISO_8601_FORMAT } from '../../constants';
import { validationErrorSelector } from '../../util/util';
import {
  validateMonth,
  validateDay,
  validateYear,
  validateNearFutureYear,
} from '../../lib/validation/date';

export default class DateField extends React.Component {
  props: {
    allowFutureYear:  boolean,
    data:             Object,
    errors:           Object,
    keySet:           Array<string>,
    label:            string,
    omitDay:          boolean,
    onBlur:           () => void,
    updateHandler:    Function,
    validator:        Function,
  };

  render() {
    const {
      data,
      errors,
      updateHandler,
      validator,
      keySet,
      label,
      omitDay,
      allowFutureYear,
      onBlur,
    } = this.props;

    // make a copy of keySet with a slightly different key for temporary storage of the textfields being edited
    let editKeySet = keySet.concat();
    editKeySet[editKeySet.length - 1] = `${editKeySet[editKeySet.length - 1]}_edit`;

    // Get the moment object from the state, or null if not available
    let getDate = () => {
      let formattedDate = _.get(data, keySet);

      if (formattedDate !== undefined && formattedDate !== null) {
        return moment(formattedDate, ISO_8601_FORMAT);
      }
      return null;
    };

    // Get an object { day, month, year } which contains the values being edited in the textbox
    // values may be strings or numbers. Otherwise return empty object.
    let pad = (toPad, length) => _.padStart(String(toPad), length, '0');
    let getEditObject = () => {
      let edit = _.get(data, editKeySet, {});

      if (_.isEmpty(edit)) {
        let date = getDate();
        if (date !== null && date.isValid()) {
          return {
            month: pad(date.month() + 1, 2),
            year: date.year(),
            day: pad(date.date(), 2),
          };
        }
      }
      return edit;
    };

    // Given text values date, month and year, update the formatted date in the data
    // if day, month and year are filled out. If at least one are invalid, store the text
    // representation instead in a temporary edit value and store null in place of the
    // date format.
    let setNewDate = (day, month, year) => {
      let clone = _.cloneDeep(data);

      let edit = getEditObject();
      // Update tuple with the typed text. Typically only one of the arguments
      // will have text at a time since the user can't edit more than one field at once
      // so we need to look in the state to see
      let newEdit = {
        ...edit,
        year: year !== undefined ? year : edit.year,
        month: month !== undefined ? month : edit.month,
        day: day !== undefined ? day : edit.day
      };

      const firstIfNumEqual = R.curry((x, y) => Number(x) === y ? x : y);
      let validatedDay = Maybe.of(1);
      if (!omitDay) {
        validatedDay = validateDay(newEdit.day);
        newEdit.day = mstr(validatedDay.map(firstIfNumEqual(newEdit.day)));
      }

      let validatedMonth = validateMonth(newEdit.month);
      newEdit.month = mstr(validatedMonth.map(firstIfNumEqual(newEdit.month)));

      let validatedYear;
      if (allowFutureYear) {
        validatedYear = validateNearFutureYear(newEdit.year);
      } else {
        validatedYear = validateYear(newEdit.year);
      }

      newEdit.year = mstr(validatedYear);

      // keep text up to date
      _.set(clone, editKeySet, newEdit);

      let padYear = s => _.padStart(s, 4, '0');

      let dateList = [validatedYear, validatedMonth, validatedDay];

      let stringifyDates = R.compose(
        R.join("-"), R.map(mstr), R.adjust(x => x.map(padYear), 0)
      );

      let dateString = S.maybe("", stringifyDates, allJust(dateList));

      let rawDate = Maybe.of(moment(dateString, ISO_8601_FORMAT));

      let validatedDate = rawDate.filter(date => date.isValid()).
        filter(date => date.isAfter(moment("1800", "YYYY")));

      if (validatedDate.isNothing) {
        _.set(clone, keySet, null);
      } else {
        _.set(clone, keySet, validatedDate.value.format(ISO_8601_FORMAT));
      }
      updateHandler(clone, validator);
    };

    let edit = getEditObject();

    let dayField, daySlash;
    if (!omitDay) {
      daySlash = <span className="slash"> / </span>;
      dayField = <TextField
        hintText="DD"
        floatingLabelText="Day"
        floatingLabelFixed={true}
        style={{
          maxWidth: "3em"
        }}
        fullWidth={true}
        value={edit.day !== undefined ? edit.day : ""}
        onChange={e => setNewDate(e.target.value, undefined, undefined)}
      />;
    }

    return (
      <fieldset className={validationErrorSelector(errors, keySet)}>
        <legend>{label}</legend>
        {" "}
        <TextField
          hintText="MM"
          floatingLabelText="Month"
          floatingLabelFixed={true}
          floatingLabelStyle={{whiteSpace: "nowrap"}}
          style={{
            maxWidth: "3em"
          }}
          errorStyle={{
            position: "absolute",
            top: "100%",
            whiteSpace: "nowrap"
          }}
          fullWidth={true}
          value={edit.month !== undefined ? edit.month : ""}
          onChange={e => setNewDate(undefined, e.target.value, undefined)}
          errorText={_.get(errors, keySet)}
        />
        <span className="slash"> / </span>
        {dayField}
        {daySlash}
        <TextField
          hintText="YYYY"
          floatingLabelText="Year"
          floatingLabelFixed={true}
          style={{
            maxWidth: "4em"
          }}
          fullWidth={true}
          value={edit.year !== undefined ? edit.year : ""}
          onChange={e => setNewDate(undefined, undefined, e.target.value)}
          onBlur={onBlur}
        />
      </fieldset>
    );
  }
}

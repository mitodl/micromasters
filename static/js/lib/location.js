import R from 'ramda';
import iso3166 from 'iso-3166-2';

export const codeToCountryName = (code: string) =>  R.pathOr(
  "", ['name'], iso3166.country(R.defaultTo("", code))
);

// @flow
import R from "ramda"
import iso3166 from "iso-3166-2"

/**
 * Gets the name of a country given its code
 * @param code Country code
 */
export const codeToCountryName = R.compose(
  R.pathOr("", ["name"]),
  iso3166.country,
  R.defaultTo("")
)

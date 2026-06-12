// @flow
import cc from "currency-codes"
import R from "ramda"
import { countries } from "countries-list"

import { labelSort } from "../util/util"

export const excludedCurrencyCodes = [
  "BOV",
  "CHE",
  "CHW",
  "COU",
  "MXV",
  "SSP",
  "USN",
  "USS",
  "UYI",
  "XBA",
  "XBB",
  "XBC",
  "XBD",
  "XBT",
  "XFU",
  "XTS",
  "XXX"
]

const codeToOption = code => ({ value: code, label: cc.code(code).currency })

const invalidCurrency = R.contains(R.__, excludedCurrencyCodes)

const codesToOptions = R.compose(
  labelSort,
  R.map(codeToOption),
  R.reject(invalidCurrency)
)

export const currencyOptions = codesToOptions(cc.codes())

export const currencyForCountry = (countryCode: string): string => {
  const entry = countries[countryCode]

  if (!entry) {
    return ""
  }

  const currency = entry.currency.split(",")[0]

  return invalidCurrency(currency) ? "" : currency
}

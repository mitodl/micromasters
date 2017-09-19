// @flow
import type { Profile } from './profileTypes'
import type { UserProgram } from './programTypes'

export type SearchResult = {
  profile: Profile,
  program: UserProgram
}

export type SearchSortItem = {
  key: string,
  label: string,
  fields?: Array<SearchSortItemField>,
  field?: string,
  order?: string,
}

export type SearchSortItemField = {
  field: string,
  options: {
    order: string,
  },
}

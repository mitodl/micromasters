// @flow
import Decimal from 'decimal.js-light'
import type { Program } from './programTypes'
import type { APIErrorInfo } from '../flow/generalTypes'

// likely to change in very near future
export type Dashboard = {
  programs: Array<Program>,
  is_edx_data_fresh: boolean,
  invalid_backend_credentials: Array<string>
}

export type DashboardState = {
  programs: Array<Program>,
  isEdxDataFresh: boolean,
  fetchStatus?: string,
  noSpinner: boolean,
  errorInfo?: APIErrorInfo,
  invalidBackendCredentials: Array<string>
}

export type DashboardsState = {
  [username: string]: DashboardState
}

export type CoursePrice = {
  program_id: number,
  price: Decimal
}

export type CoursePrices = Array<CoursePrice>;

export type CoursePricesState = {
  coursePrices: CoursePrices,
  fetchStatus?: string,
  noSpinner?: boolean,
  errorInfo?: APIErrorInfo,
}

export type CoursePriceReducerState = {
  [username: string]: CoursePricesState
}

export type ProgramLearner = {
  username: string,
  image_small: string,
}

export type ProgramLearners = {
  learners: Array<ProgramLearner>,
  learners_count: number,
}

// @flow
import type { APIErrorInfo } from './generalTypes'

export type AvailableProgram = {
  id: number,
  title: string,
  programpage_url: ?string,
  enrolled: boolean,
  total_courses: ?number,
}

export type AvailablePrograms = Array<AvailableProgram>

export type AvailableProgramsState = {
  availablePrograms: AvailablePrograms,
  getStatus?: string,
  getErrorInfo?: APIErrorInfo,
  postStatus?: string,
  postErrorInfo?: APIErrorInfo,
}

export type CourseEnrollmentsState = {
  courseEnrollAddStatus?: string,
}


export type UnEnrollPrograms = {
  program_id: number,
  title: string,
}

// @flow
import type { APIErrorInfo } from './generalTypes';

export type AvailableProgram = {
  id: number,
  title: string,
  programpage_url: ?string,
  enrolled: boolean,
};

export type AvailablePrograms = Array<AvailableProgram>;

export type AvailableProgramsState = {
  programEnrollments: AvailablePrograms,
  getStatus?: string,
  getErrorInfo?: APIErrorInfo,
  postStatus?: string,
};

export type CourseEnrollmentsState = {
  courseEnrollAddStatus?: string,
};

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
  availablePrograms: AvailablePrograms,
  getStatus?: string,
  getErrorInfo?: APIErrorInfo,
  postStatus?: string,
  postErrorInfo?: APIErrorInfo,
};

export type CourseEnrollmentsState = {
  courseEnrollAddStatus?: string,
};

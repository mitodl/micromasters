// @flow
import type { APIErrorInfo } from './generalTypes';

export type ProgramEnrollment = {
  id: number,
  title: string,
};

export type ProgramEnrollments = Array<ProgramEnrollment>;

export type ProgramEnrollmentsState = {
  programEnrollments: ProgramEnrollments,
  getStatus?: string,
  getErrorInfo?: APIErrorInfo,
  postStatus?: string,
};

export type CourseEnrollmentsState = {
  courseEnrollAddStatus?: string,
};

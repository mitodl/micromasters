// @flow
export type ProgramEnrollment = {
  id: number,
  title: string,
};

export type ProgramEnrollments = Array<ProgramEnrollment>;

export type ProgramEnrollmentsState = {
  programEnrollments: ProgramEnrollments,
  getStatus?: string,
  postStatus?: string,
};
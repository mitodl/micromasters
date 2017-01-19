// @flow
import {
  FA_STATUS_APPROVED,
  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_CREATED,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_PENDING_MANUAL_APPROVAL,
  FA_STATUS_SKIPPED,
  FA_STATUS_RESET,
} from '../constants';

export type FinancialAidUserInfo = {
  application_status: (
    FA_STATUS_APPROVED |
    FA_STATUS_AUTO_APPROVED |
    FA_STATUS_CREATED |
    FA_STATUS_DOCS_SENT |
    FA_STATUS_PENDING_DOCS |
    FA_STATUS_PENDING_MANUAL_APPROVAL |
    FA_STATUS_SKIPPED |
    FA_STATUS_RESET
  ),
  date_documents_sent: ?string,
  has_user_applied: boolean,
  max_possible_cost: number,
  min_possible_cost: number,
  id: number,
};

export type Program = {
  courses: Array<Course>,
  id: number,
  title: string,
  financial_aid_availability: boolean,
  financial_aid_user_info: FinancialAidUserInfo,
};

export type Course = {
  runs: Array<CourseRun>,
  title: string,
  id: number,
  position_in_program: number,
};

export type ProgramPageCourse = {
  id:               number,
  title:            string,
  description:      string,
  url:              string,
  enrollment_text:  string,
};

export type CourseRun = {
  id: number,
  position: number,
  current_grade?: number,
  final_grade?: number,
  course_id: string,
  title: string,
  fuzzy_enrollment_start_date?: string,
  status: string,
  enrollment_start_date?: string,
  fuzzy_start_date?: string,
  course_start_date?: string,
  course_end_date?: string,
  course_upgrade_deadline?: string,
  price?: number,
  enrollment_url?: ?string,
};

export type UserProgram = {
  grade_average: number
};

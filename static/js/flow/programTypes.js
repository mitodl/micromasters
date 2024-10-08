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
} from '../constants'

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
}

export type Program = {
  courses:                    Array<Course>,
  id:                         number,
  title:                      string,
  financial_aid_availability: boolean,
  has_exams:                  boolean,
  financial_aid_user_info:    FinancialAidUserInfo,
  exam_card_status:        string,
  grade_average:              ?number,
  certificate:                string,
  grade_records_url:          string,
  program_letter_url:         string,
  number_courses_required:    number,
  number_courses_passed:      number,
  has_mitxonline_courses:     boolean,
  has_socialauth_for_backend: boolean
}

export type ProctoredExamResult = {
  exam_date:               string,
  passing_score:           number,
  score:                   number,
  grade:                   string,
  client_authorization_id: string,
  passed:                  boolean,
  percentage_grade:        number
}

export type Course = {
  runs:                         Array<CourseRun>,
  title:                        string,
  has_contact_email:            boolean,
  id:                           number,
  position_in_program:          number,
  can_schedule_exam:            boolean,
  exam_register_end_date:       string,
  exam_course_key:              string,
  exams_schedulable_in_future:  Array<string>,
  exam_date_next_semester:      string,
  current_exam_dates:           string,
  has_to_pay:                   boolean,
  proctorate_exams_grades:      Array<ProctoredExamResult>,
  is_elective:                  boolean,
  has_exam:                     boolean,
  certificate_url:              string,
  overall_grade:                string,
  is_passed:                    boolean,
}

export type ProgramPageCourse = {
  id:               number,
  title:            string,
  description:      string,
  url:              string,
  enrollment_text:  string,
}

export type ProgramPageElectiveSet = {
  required_number:              number,
  title:                        string,
  courses:                      Array<ProgramPageCourse>,
}

export type CourseRun = {
  id:                           number,
  position:                     number,
  current_grade?:               number,
  final_grade?:                 number,
  course_id:                    string,
  title:                        string,
  fuzzy_enrollment_start_date?: string,
  status:                       string,
  enrollment_start_date?:       string,
  fuzzy_start_date?:            string,
  course_start_date?:           ?string,
  course_end_date?:             string,
  course_upgrade_deadline?:     string,
  enrollment_url?:              ?string,
  has_paid:                     boolean,
  year_season:                  string,
  courseware_backend:           string,
}

export type UserProgram = {
  grade_average: number
}

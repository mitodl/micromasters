export type FinancialAidUserInfo = {
  application_status: string;
  date_documents_sent: ?string;
  has_user_applied: boolean;
  max_possible_cost: number;
  min_possible_cost: number;
  id: number;
};

export type Program = {
  courses: Array<Course>;
  id: number;
  financial_aid_availability: boolean;
  financial_aid_user_info?: FinancialAidUserInfo;
};
export type Course = {
  runs: Array<CourseRun>;
  id: number;
};
export type CourseRun = {
  grade?: number|null;
  course_id: string;
  title: string;
  fuzzy_enrollment_start_date?: string;
  status: string;
  enrollment_start_date?: string;
  fuzzy_start_date?: string;
  course_start_date?: string;
  course_end_date?: string;
  course_upgrade_deadline?: string;
  price?: number;
};
export type FinancialAid = {
  application_status: string;
  has_user_applied: boolean;
  max_possible_cost: number;
  min_possible_cost: number;
};
export type UserProgram = {
  grade_average: number
};

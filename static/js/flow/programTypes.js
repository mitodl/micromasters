export type Program = {
  courses: Array<Course>;
  id: number;
  financial_aid_availability: boolean;
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
  price?: number;
};

export type UserProgram = {
  grade_average: number
};

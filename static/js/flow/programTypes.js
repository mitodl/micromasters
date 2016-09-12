export type Program = {
  courses: Array<Course>;
  id: number;
};
export type Course = {
  runs: Array<CourseRun>;
  status?: string;
  id: number;
};
export type CourseRun = {
  grade?: number|null;
  course_id?: number|string;
  title?: string;
  fuzzy_enrollment_start_date?: string;
  status?: string;
  enrollment_start_date?: string;
  fuzzy_start_date?: string;
  course_start_date?: string;
  course_end_date?: string;
  price?: number;
};

export type UserProgram = {
  grade_average: number
};

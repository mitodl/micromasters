// @flow
import type { Validator, UIValidator } from '../util/validation';
import type { UIState } from '../reducers/ui';

export type EducationEntry = {
  id?: ?number;
  degree_name: string;
  graduation_date: ?string|DateEdit;
  graduation_date_edit?: ?string;
  field_of_study: ?string;
  online_degree: boolean;
  school_name: ?string;
  school_city: ?string;
  school_state_or_territory: ?string;
  school_country: ?string;
};

export type DateEdit = {
  month: ?string;
  year: ?string;
};

export type WorkHistoryEntry = {
  id?: ?number;
  position?: ?string;
  industry?: ?string;
  company_name?: ?string;
  start_date?: ?string|DateEdit;
  start_date_edit?: ?string|DateEdit;
  end_date?: ?string|DateEdit;
  end_date_edit?: DateEdit;
  city?: ?string;
  country?: ?string;
  state_or_territory?: ?string;
};

export type ValidationErrors = {
  date_of_birth?: string;
};

export type Profile = {
  first_name: string;
  education: EducationEntry[];
  work_history: WorkHistoryEntry[];
  getStatus: string;
  date_of_birth: string;
  edx_level_of_education: string;
  username: string;
  preferred_name: string;
  pretty_printed_student_id: string;
  city: string;
};

export type Profiles = {
  [username: string]: ProfileGetResult,
};

export type ProfileGetResult = {
  profile?: Profile,
  errorInfo?: APIErrorInfo,
  getStatus: string,
  edit?: Object;
};

export type BoundSaveProfile = (validator: Validator|UIValidator, profile: Profile, ui: UIState) => Promise<Profile>;

export type APIErrorInfo = {
  error_code?: string,
  user_message?: string,
  detail?: string,
  errorStatusCode: number,
};

// @flow
import type { Validator, UIValidator } from '../util/validation';
import type { UIState } from '../reducers/ui';
import type { APIErrorInfo } from './generalTypes';

export type EducationEntry = {
  id?: ?number;
  degree_name: string;
  graduation_date: string;
  graduation_date_edit?: DateEdit;
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
  position: string;
  industry: string;
  company_name: string;
  start_date: string;
  start_date_edit?: string|DateEdit;
  end_date: ?string;
  end_date_edit?: DateEdit;
  city?: ?string;
  country?: ?string;
  state_or_territory?: ?string;
};

export type ValidationErrors = {
  date_of_birth?:         string;
  work_history_required?: string;
};

export type Profile = {
  first_name: string;
  education: EducationEntry[];
  work_history: WorkHistoryEntry[];
  getStatus: string;
  email: string;
  date_of_birth: string;
  edx_level_of_education: string;
  username: string;
  preferred_name: string;
  pretty_printed_student_id: string;
  city: string;
  country: string;
  state_or_territory: string;
  email_optin: boolean;
  agreed_to_terms_of_service: boolean;
  image: ?string;
};

export type Profiles = {
  [username: string]: ProfileGetResult,
};

export type ProfileGetResult = {
  profile: Profile,
  errorInfo?: APIErrorInfo,
  getStatus: string,
  edit?: {errors: ValidationErrors, profile: Profile},
};

export type ProfilePatchResult = ProfileGetResult;

export type SaveProfileFunc = (validator: Validator|UIValidator, profile: Profile, ui: UIState) => Promise<Profile>;
export type UpdateProfileFunc = (profile: Profile, validator: Validator|UIValidator) => void;

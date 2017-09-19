// @flow
import type { Validator, UIValidator } from '../lib/validation/profile'
import type { UIState } from '../reducers/ui'
import type { APIErrorInfo } from './generalTypes'

export type EducationEntry = {
  id?:                        ?number,
  degree_name:                string,
  graduation_date:            string,
  graduation_date_edit?:      DateEdit,
  field_of_study:             ?string,
  online_degree:              boolean,
  school_name:                ?string,
  school_city:                ?string,
  school_state_or_territory:  ?string,
  school_country:             ?string,
}

export type DateEdit = {
  month: ?string,
  year: ?string,
}

export type WorkHistoryEntry = {
  id?:                  ?number,
  position:             string,
  industry:             string,
  company_name:         string,
  start_date:           string,
  start_date_edit?:     string|DateEdit,
  end_date:             ?string,
  end_date_edit?:       DateEdit,
  city?:                ?string,
  country?:             ?string,
  state_or_territory?:  ?string,
}

export type ValidationErrors = {
  date_of_birth?:         string,
  work_history_required?: string,
}

export type Profile = {
  first_name:                  string,
  last_name:                   string,
  full_name:                   string,
  education:                   EducationEntry[],
  work_history:                WorkHistoryEntry[],
  getStatus:                   string,
  email:                       string,
  date_of_birth:               string,
  edx_level_of_education:      string,
  username:                    string,
  preferred_name:              string,
  pretty_printed_student_id:   string,
  city:                        string,
  country:                     string,
  state_or_territory:          string,
  email_optin:                 boolean,
  agreed_to_terms_of_service:  boolean,
  image:                       ?string,
  image_small:                 ?string,
  image_medium:                ?string,
  about_me:                    ?string,
  romanized_first_name:        ?string,
  romanized_last_name:         ?string,
  student_id:                  number,
  postal_code:                 string,
}

export type Profiles = {
  [username: string]: ProfileGetResult,
}

type ValidationVisibility = Array<string[]>

export type ProfileGetResult = {
  profile: Profile,
  errorInfo?: APIErrorInfo,
  getStatus?: string,
  patchStatus?: string,
  edit?: {
    errors: ValidationErrors,
    profile: Profile,
    visibility: ValidationVisibility,
  },
}

export type ProfilePatchResult = ProfileGetResult

export type ProfileFetchResponse = {
  payload: ProfileGetResult
}

export type SaveProfileFunc = (validator: Validator|UIValidator, profile: Profile, ui: UIState) => Promise<Profile>
export type UpdateProfileFunc = (profile: Profile, validator: Validator|UIValidator) => void

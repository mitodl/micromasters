/* global SETTINGS: false */
import urljoin from "url-join"

export const HIGH_SCHOOL = "hs"
export const ASSOCIATE = "a"
export const BACHELORS = "b"
export const MASTERS = "m"
export const DOCTORATE = "p"

export const ISO_8601_FORMAT = "YYYY-MM-DD"
export const DASHBOARD_FORMAT = "MMMM D, Y"
export const DASHBOARD_MONTH_FORMAT = "MM[/]YYYY"
export const COURSE_DEADLINE_FORMAT = `${DASHBOARD_FORMAT} [at] hA z`

export const CP1252_REGEX = /^[\u0020-\u00FF]*$/
// greater-than, comma, quotation-mark
export const INVALID_NAME_CHARS_REGEX = /[\u003E\u002C\u0022]/

// NOTE: this is in order of attainment
export const EDUCATION_LEVELS = [
  { value: HIGH_SCHOOL, label: "High school" },
  { value: ASSOCIATE, label: "Associate degree" },
  { value: BACHELORS, label: "Bachelor's degree" },
  { value: MASTERS, label: "Master's or professional degree" },
  { value: DOCTORATE, label: "Doctorate" }
]

export const SEARCH_FACET_FIELD_LABEL_MAP = {
  "program.courses.course_title":      "Course",
  "program.course_runs.semester":      "Semester",
  "program.courses.payment_status":    "Payment Status",
  "program.grade_average":             "Average Grade in Program",
  "grade-average":                     "Average Grade in Program",
  "profile.birth_country":             "Country of Birth",
  "profile.country":                   "Current Residence",
  "profile.education.degree_name":     "Degree",
  "profile.work_history.company_name": "Company",
  "num-courses-passed":                "# of Courses Passed",
  "program.courses.final_grade":       "Final Grade"
}

// NOTE: these need to be kept in sync with ui/url_utils.py
export const PERSONAL_STEP = "personal"
export const EMPLOYMENT_STEP = "professional"
export const EDUCATION_STEP = "education"

export const YEAR_VALIDATION_CUTOFF = 120

export const ALL_ERRORS_VISIBLE = "ALL_ERRORS_VISIBLE"

export const PROFILE_STEP_LABELS = new Map([
  [PERSONAL_STEP, "Personal"],
  [EDUCATION_STEP, "Education"],
  [EMPLOYMENT_STEP, "Professional"]
])

export const PROFILE_STEP_ORDER = [
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP
]

export const DEFAULT_OPTION_LIMIT_COUNT = 10

export const SEARCH_FILTER_DEFAULT_VISIBILITY = true

export const STATUS_PASSED = "passed"
export const STATUS_NOT_PASSED = "not-passed"
export const STATUS_CURRENTLY_ENROLLED = "currently-enrolled"
export const STATUS_WILL_ATTEND = "will-attend"
export const STATUS_CAN_UPGRADE = "can-upgrade"
export const STATUS_MISSED_DEADLINE = "missed-deadline"
export const STATUS_OFFERED = "offered"
export const STATUS_PAID_BUT_NOT_ENROLLED = "paid-but-not-enrolled"

// note: this status is not sent from the server
export const STATUS_PENDING_ENROLLMENT = "pending-enrollment"

export const ALL_COURSE_STATUSES = [
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_PENDING_ENROLLMENT,
  STATUS_MISSED_DEADLINE,
  STATUS_PAID_BUT_NOT_ENROLLED
]

// financial aid statuses
export const FA_STATUS_CREATED = "created"
export const FA_STATUS_PENDING_DOCS = "pending-docs"
export const FA_STATUS_DOCS_SENT = "docs-sent"
export const FA_STATUS_PENDING_MANUAL_APPROVAL = "pending-manual-approval"
export const FA_STATUS_APPROVED = "approved"
export const FA_STATUS_AUTO_APPROVED = "auto-approved"
export const FA_STATUS_SKIPPED = "skipped"
export const FA_STATUS_RESET = "reset"

export const FA_ALL_STATUSES = [
  FA_STATUS_CREATED,
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_PENDING_MANUAL_APPROVAL,
  FA_STATUS_APPROVED,
  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_SKIPPED,
  FA_STATUS_RESET
]
export const FA_PENDING_STATUSES = [
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_PENDING_MANUAL_APPROVAL
]
export const FA_TERMINAL_STATUSES = [
  FA_STATUS_AUTO_APPROVED,
  FA_STATUS_APPROVED,
  FA_STATUS_SKIPPED
]

export const TOAST_SUCCESS = "done"
export const TOAST_FAILURE = "error"

export const EDX_LINK_BASE = urljoin(SETTINGS.edx_base_url, "courses/")

export const COUPON_CONTENT_TYPE_COURSE = "course"
export const COUPON_CONTENT_TYPE_PROGRAM = "program"

export const COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT = "percent-discount"
export const COUPON_AMOUNT_TYPE_FIXED_DISCOUNT = "fixed-discount"
export const COUPON_AMOUNT_TYPE_FIXED_PRICE = "fixed-price"

export const COUPON_TYPE_STANDARD = "standard"
export const COUPON_TYPE_DISCOUNTED_PREVIOUS_COURSE =
  "discounted-previous-course"

export const PEARSON_PROFILE_ABSENT = "absent"
export const PEARSON_PROFILE_SUCCESS = "success"
export const PEARSON_PROFILE_IN_PROGRESS = "in-progress"
export const PEARSON_PROFILE_INVALID = "invalid"
export const PEARSON_PROFILE_SCHEDULABLE = "schedulable"

export const GET = "GET"
export const PATCH = "PATCH"
export const POST = "POST"

export const COURSE_ACTION_PAY = "PAY"
export const COURSE_ACTION_ENROLL = "ENROLL"
export const COURSE_ACTION_REENROLL = "REENROLL"
export const COURSE_ACTION_CALCULATE_PRICE = "CALCULATE_PRICE"

export const GRADE_DETAIL_DIALOG = "GRADE_DETAIL_DIALOG"
export const CHANNEL_CREATE_DIALOG = "CHANNEL_CREATE_DIALOG"

export const RECIPIENT_VARIABLE_NAMES = ["PreferredName", "Email"]

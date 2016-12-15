/* global SETTINGS: false */
import urljoin from 'url-join';
import deepFreeze from 'deep-freeze';

export const HIGH_SCHOOL = 'hs';
export const ASSOCIATE = 'a';
export const BACHELORS = 'b';
export const MASTERS = 'm';
export const DOCTORATE = 'p';

export const ISO_8601_FORMAT = 'YYYY-MM-DD';
export const DASHBOARD_FORMAT = 'M/D/Y';
export const DASHBOARD_MONTH_FORMAT = 'MM[/]YYYY';

// NOTE: this is in order of attainment
export const EDUCATION_LEVELS = [
  {value: HIGH_SCHOOL, label: "High school"},
  {value: ASSOCIATE, label: 'Associate degree'},
  {value: BACHELORS, label: "Bachelor's degree"},
  {value: MASTERS, label: "Master's or professional degree"},
  {value: DOCTORATE, label: "Doctorate"}
];

// NOTE: these need to be kept in sync with ui/url_utils.py
export const PERSONAL_STEP = 'personal';
export const EMPLOYMENT_STEP = 'professional';
export const EDUCATION_STEP = 'education';

export const YEAR_VALIDATION_CUTOFF = 120;

export const ALL_ERRORS_VISIBLE = 'ALL_ERRORS_VISIBLE';

export const PROFILE_STEP_LABELS = new Map([
  [PERSONAL_STEP, "Personal"],
  [EDUCATION_STEP, "Education"],
  [EMPLOYMENT_STEP, "Professional"]
]);

export const PROFILE_STEP_ORDER = [
  PERSONAL_STEP,
  EDUCATION_STEP,
  EMPLOYMENT_STEP
];

export const DEFAULT_OPTION_LIMIT_COUNT = 10;

export const SEARCH_FILTER_DEFAULT_VISIBILITY = true;

export const STATUS_PASSED = 'passed';
export const STATUS_NOT_PASSED = 'not-passed';
export const STATUS_CURRENTLY_ENROLLED = 'currently-enrolled';
export const STATUS_WILL_ATTEND = 'will-attend';
export const STATUS_CAN_UPGRADE = 'can-upgrade';
export const STATUS_MISSED_DEADLINE = 'missed-deadline';
export const STATUS_OFFERED = 'offered';

// note: this status is not sent from the server
export const STATUS_PENDING_ENROLLMENT = 'pending-enrollment';

export const ALL_COURSE_STATUSES = [
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_PENDING_ENROLLMENT,
  STATUS_MISSED_DEADLINE,
];

// financial aid statuses
export const FA_STATUS_CREATED = 'created';
export const FA_STATUS_PENDING_DOCS = 'pending-docs';
export const FA_STATUS_DOCS_SENT = 'docs-sent';
export const FA_STATUS_PENDING_MANUAL_APPROVAL = 'pending-manual-approval';
export const FA_STATUS_APPROVED = 'approved';
export const FA_STATUS_AUTO_APPROVED = 'auto-approved';
export const FA_STATUS_SKIPPED = 'skipped';

export const FA_PENDING_STATUSES = [
  FA_STATUS_PENDING_DOCS,
  FA_STATUS_DOCS_SENT,
  FA_STATUS_PENDING_MANUAL_APPROVAL
];
export const FA_APPROVED_STATUSES = [FA_STATUS_APPROVED, FA_STATUS_AUTO_APPROVED];

export const TOAST_SUCCESS = 'success';
export const TOAST_FAILURE = 'failure';

export const EDX_LINK_BASE = urljoin(SETTINGS.edx_base_url, 'courses/');

export const ELASTICSEARCH_RESPONSE = deepFreeze({
  "took": 22,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 1,
    "max_score": 1,
    "hits": [
      {
        "_index": "micromasters",
        "_type": "user",
        "_id": "3",
        "_score": 1,
        "_source": {
          "profile": {
            "username": "test_user",
            "filled_out": true,
            "account_privacy": "public",
            "email_optin": true,
            "first_name": "Test",
            "last_name": "User",
            "preferred_name": "Test",
            "country": "AF",
            "state_or_territory": "AF-BDS",
            "city": "Kabul",
            "birth_country": "AF",
            "nationality": "US",
            "date_of_birth": "1986-08-12",
            "preferred_language": "ab",
            "gender": "f",
            "pretty_printed_student_id": "MMM000003",
            "work_history": [
              {
                "id": 15,
                "city": "Kabul",
                "state_or_territory": "AF-BDS",
                "country": "AF",
                "company_name": "Test Corp",
                "position": "Assistant Foobar",
                "industry": "Accounting",
                "end_date": null,
                "start_date": "1999-12-01"
              }
            ],
            "edx_level_of_education": "jhs",
            "education": [
              {
                "id": 12,
                "degree_name": "hs",
                "graduation_date": "1998-07-12",
                "field_of_study": null,
                "online_degree": false,
                "school_name": " High School",
                "school_city": "Kabul",
                "school_state_or_territory": "AF-BDS",
                "school_country": "AF"
              }
            ]
          },
          "id": 3
        }
      }
    ]
  },
  "aggregations": {
    "profile.birth_country3": {
      "doc_count": 2,
      "inner": {
        "doc_count": 2,
        "profile.birth_country_count": {
          "value": 1
        },
        "profile.birth_country": {
          "doc_count_error_upper_bound": 0,
          "sum_other_doc_count": 0,
          "buckets": [
            {
              "key": "AF",
              "doc_count": 2
            }
          ]
        }
      }
    },
    "profile.country4": {
      "doc_count": 2,
      "inner": {
        "doc_count": 2,
        "profile.country": {
          "doc_count_error_upper_bound": 0,
          "sum_other_doc_count": 0,
          "buckets": [
            {
              "key": "AF",
              "doc_count": 2
            }
          ]
        },
        "profile.country_count": {
          "value": 1
        }
      }
    },
    "profile.gender2": {
      "doc_count": 2,
      "inner": {
        "doc_count": 2,
        "profile.gender": {
          "doc_count_error_upper_bound": 0,
          "sum_other_doc_count": 0,
          "buckets": [
            {
              "key": "f",
              "doc_count": 2
            }
          ]
        },
        "profile.gender_count": {
          "value": 1
        }
      }
    }
  }
});

export const USER_PROFILE_RESPONSE = deepFreeze({
  "image": "some_sort_of_image.png",
  "username": SETTINGS.user ? SETTINGS.user.username : null,
  "filled_out": true,
  "agreed_to_terms_of_service": true,
  "account_privacy": "all_users",
  "email": "jane@foobar.baz",
  "email_optin": false,
  "first_name": "Jane",
  "last_name": "Garris",
  "preferred_name": "Jane",
  "country": "US",
  "state_or_territory": "MA",
  "city": "Cambridge",
  "birth_country": "US",
  "nationality": "DE",
  "date_of_birth": '1984-04-13',
  "preferred_language": 'en',
  "gender": "f",
  "pretty_printed_student_id": "MMM000011",
  "work_history": [{
    "id": 1,
    "city": "Cambridge",
    "state_or_territory": "US-MA",
    "country": "US",
    "company_name": "MIT",
    "position": "Software Developer",
    "industry": "Education",
    "start_date": "1982-02-02",
    "end_date": "1982-03-21"
  }, {
    "id": 2,
    "city": "New York",
    "state_or_territory": "US-NY",
    "country": "US",
    "company_name": "Planet Express",
    "position": "Delivery",
    "industry": "Shipping",
    "start_date": "1999-03-28",
    "end_date": "2013-09-04"
  }],
  "education": [{
    "id": 1,
    "degree_name": HIGH_SCHOOL,
    "graduation_date": "2013-05-01",
    "field_of_study": "Computer Science",
    "school_name": "MIT",
    "school_city": "Cambridge",
    "school_state_or_territory": "US-MA",
    "school_country": "US",
    "online_degree": false
  }, {
    "id": 2,
    "degree_name": BACHELORS,
    "graduation_date": "1975-12-01",
    "field_of_study": "Philosophy",
    "school_name": "Harvard",
    "school_city": "Cambridge",
    "school_state_or_territory": "US-MA",
    "school_country": "US",
    "online_degree": false
  }],
  "edx_level_of_education": null,
});

export const USER_PROGRAM_RESPONSE = deepFreeze({
  "grade_average": 83
});

export const DASHBOARD_RESPONSE = deepFreeze([
  {
    "description": "Not passed program",
    "title": "Not passed program",
    "courses": [
      {
        "prerequisites": "",
        "runs": [
          {
            "position": 1,
            "title": "Gio Test Course #15",
            "course_id": "course-v1:odl+GIO101+CR-FALL15",
            "status": STATUS_NOT_PASSED,
            "id": 1,
            "course_start_date": "2016-09-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2016",
            "course_end_date": "2016-09-09T10:20:10Z"
          },
          {
            "position": 2,
            "title": "Gio Test Course #14",
            "course_id": "course-v1:odl+GIO101+FALL14",
            "status": STATUS_NOT_PASSED,
            "final_grade": "33",
            "id": 2,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          },
          {
            "certificate_url": "www.google.com",
            "title": "Gio Test Course #13",
            "status": STATUS_PASSED,
            "position": 3,
            "final_grade": "66",
            "course_id": "course-v1:odl+GIO101+FALL13",
            "id": 3,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "position_in_program": 0,
        "title": "Gio Course - failed, no grade",
        "description": "",
        "id": 1
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 1,
        "title": "8.MechCx Advanced Introductory Classical Mechanics",
        "description": "",
        "id": 2
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 2,
        "title": "EDX Demo course",
        "description": "",
        "id": 3
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 3,
        "title": "Peter Course",
        "description": "",
        "id": 4
      }
    ],
    "financial_aid_availability": false,
    "id": 3
  },
  {
    "courses": [
      {
        "id": 5,
        "position_in_program": 1,
        "title": "Supply Chain and Logistics Fundamentals - enroll button",
        "runs": [
          {
            "course_id": "course-v1:supply+chain",
            "id": 4,
            "status": STATUS_OFFERED,
            "fuzzy_enrollment_start_date": null,
            "title": "Supply Chain Design",
            "enrollment_start_date": "2016-03-04T01:00:00Z",
            "position": 0,
            "price": 50.00,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 6,
        "position_in_program": 5,
        "title": "Passed course - check mark, grade is 88%",
        "runs": [
          {
            "certificate_url": "www.google.com",
            "course_id": "course-v1:edX+DemoX+Demo_Course",
            "id": 5,
            "status": STATUS_PASSED,
            "title": "Demo course",
            "final_grade": "88",
            "position": 0,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "description": "The demo course",
        "prerequisites": ""
      },
      {
        "id": 7,
        "position_in_program": 2,
        "title": "Empty course - no status text",
        "runs": [
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 6789,
        "position_in_program": 11,
        "title": "Current verified course - grade is 88%",
        "runs": [
          {
            "certificate_url": "www.google.com",
            "course_id": "course-v1:current",
            "id": 5678,
            "status": STATUS_CURRENTLY_ENROLLED,
            "title": "Current course run",
            "current_grade": "23",
            "position": 0,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "description": "The demo course",
        "prerequisites": ""
      },
      {
        "id": 8,
        "position_in_program": 3,
        "title": "Not verified course - upgrade button",
        "runs": [
          {
            "id": 7,
            "status": STATUS_CAN_UPGRADE,
            "title": "Not verified run",
            "course_id": "not-verified",
            "position": 0,
            "price": 50.00,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
            "course_upgrade_deadline": "2016-08-20T11:48:27Z",
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 10,
        "position_in_program": 4,
        "title": "Enrollment starting course - disabled enroll button, text says Enrollment begins 3/3/2106",
        "runs": [
          {
            "course_id": "course-v1:supply+chain2",
            "id": 8,
            "status": STATUS_OFFERED,
            "fuzzy_enrollment_start_date": null,
            "title": "Enrollment starting run",
            "enrollment_start_date": "2106-03-04T01:00:00Z",
            "position": 0,
            "price": 30.00,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 1278,
        "title": "Passed course, most recent run non-passed, older passed",
        "position_in_program": 7,
        "runs": [
          {
            "certificate_url": "www.google.com",
            "title": "Passed run missing grade",
            "status": STATUS_PASSED,
            "position": 2,
            "course_id": "course_id_one",
            "id": 100,
            "course_start_date": "2015-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2015",
            "course_end_date": "2015-09-09T10:20:10Z",
          },
          {
            "certificate_url": "www.google.com",
            "title": "Passed run missing grade",
            "status": STATUS_PASSED,
            "position": 1,
            "course_id": "course_id_two",
            "final_grade": "88",
            "id": 102,
            "course_start_date": "2015-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2015",
            "course_end_date": "2015-09-09T10:20:10Z",
          },
          {
            "certificate_url": "www.google.com",
            "title": "Passed run missing grade",
            "status": STATUS_NOT_PASSED,
            "position": 0,
            "course_id": "course_id_three",
            "final_grade": "43",
            "id": 101,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ]
      },
      {
        "id": 17,
        "title": "Passed course missing grade - check mark, no grade",
        "position_in_program": 6,
        "runs": [
          {
            "certificate_url": "www.google.com",
            "title": "Passed run missing grade",
            "status": STATUS_PASSED,
            "position": 0,
            "course_id": "course_id",
            "id": 10,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ]
      },
      {
        "id": 15,
        "position_in_program": 9,
        "title": "verified not completed, course starts in future - action text is Course starting",
        "runs": [
          {
            "id": 13,
            "status": STATUS_WILL_ATTEND,
            "course_start_date": "8765-03-21",
            "title": "First run",
            "position": 0,
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
            "course_id": "verified",
          }
        ]
      },
      {
        "id": 11,
        "position_in_program": 0,
        "title": "Fuzzy enrollment starting course - First in program, action text is enrollment begins soonish",
        "runs": [
          {
            "course_id": "course-v1:supply+chain3",
            "id": 9,
            "status": STATUS_OFFERED,
            "fuzzy_enrollment_start_date": "soonish",
            "title": "Fuzzy enrollment starting run",
            "position": 0,
            "price": 40.00,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 16,
        "position_in_program": 10,
        "title": "Pending enrollment course",
        "runs": [
          {
            "course_id": "course-v1:pending",
            "id": 47,
            "title": "Pending enrollment course run",
            "position": 0,
            "status": STATUS_PENDING_ENROLLMENT,
            "course_start_date": "2018-08-22T11:48:27Z",
            "course_end_date": "2018-09-09T10:20:10Z",
            "enrollment_start_date": "2016-03-04T01:00:00Z",
          }
        ]
      }
    ],
    "title": "Master Program",
    "description": null,
    "financial_aid_availability": false,
    "id": 4
  },
  {
    "title": "Missed deadline program",
    "description": "Missed deadline program",
    "courses": [{
      "id": 9,
      "position_in_program": 0,
      "title": "Course for the missed deadline program",
      "description": "Course for the missed deadline program",
      "prerequisites": "",
      "runs": [{
        "course_id": "course-v1:edX+missed+deadline",
        "id": 6,
        "status": STATUS_MISSED_DEADLINE,
        "title": "Course run for the missed deadline program",
        "position": 0,
        "course_start_date": "2016-01-01",
        "course_end_date": "2016-09-09T10:20:10Z",
      }]
    }],
    "id": 5
  },
  {
    "title": "Empty program",
    "description": "The empty program",
    "courses": [
    ],
    "id": 2
  },
  {
    "title": "Last program",
    "description": "The last program",
    "courses": [
      {
        "id": 13,
        "position_in_program": 0,
        "title": "Course for last program in progress - no grade, action or description",
        "runs": [
          {
            "course_id": "course-v1:edX+DemoX+Demo_Course2",
            "id": 11,
            "status": STATUS_CURRENTLY_ENROLLED,
            "title": "Course run for last program",
            "position": 0,
            "course_start_date": "2016-01-01",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "description": "Course for Last program",
        "prerequisites": ""
      },
    ],
    "financial_aid_availability": false,
    "id": 6
  },
]);

export const PROGRAMS = deepFreeze(DASHBOARD_RESPONSE.map(program => ({
  id: program.id,
  title: program.title,
  programpage_url: `/program${program.id}/`,
  enrolled: true
})));

export const FINANCIAL_AID_PARTIAL_RESPONSE = deepFreeze({
  application_status: null,
  has_user_applied: false,
  max_possible_cost: 1000,
  min_possible_cost: 1000
});

export const COURSE_PRICES_RESPONSE = deepFreeze(DASHBOARD_RESPONSE.map(program => ({
  program_id: program.id,
  price: program.id * 1000,
  financial_aid_availability: false,
  has_financial_aid_request: false
})));

export const ERROR_RESPONSE = deepFreeze({
  "errorStatusCode": 500,
  "error_code": "AB123",
  "user_message": "custom error message for the user."
});

/* eslint-disable max-len */
export const CYBERSOURCE_CHECKOUT_RESPONSE = deepFreeze({
  "payload": {
    "access_key": "access_key",
    "amount": "123.45",
    "consumer_id": "staff",
    "currency": "USD",
    "locale": "en-us",
    "override_custom_cancel_page": "https://micromasters.mit.edu?cancel",
    "override_custom_receipt_page": "https://micromasters.mit.edu?receipt",
    "profile_id": "profile_id",
    "reference_number": "MM-george.local-56",
    "signature": "56ItDy52E+Ii5aXhiq89OwRsImukIQRQetaHVOM0Fug=",
    "signed_date_time": "2016-08-24T19:07:57Z",
    "signed_field_names": "access_key,amount,consumer_id,currency,locale,override_custom_cancel_page,override_custom_receipt_page,profile_id,reference_number,signed_date_time,signed_field_names,transaction_type,transaction_uuid,unsigned_field_names",
    "transaction_type": "sale",
    "transaction_uuid": "uuid",
    "unsigned_field_names": ""
  },
  "url": "https://testsecureacceptance.cybersource.com/pay",
  "method": "POST"
});
export const EDX_CHECKOUT_RESPONSE = deepFreeze({
  "payload": {},
  "url": "http://edx.org",
  "method": "GET"
});
/* eslint-enable max-len */

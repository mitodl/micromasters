/* global SETTINGS: false */
export const HIGH_SCHOOL = 'hs';
export const ASSOCIATE = 'a';
export const BACHELORS = 'b';
export const MASTERS = 'm';
export const DOCTORATE = 'p';

export const ELASTICSEARCH_RESPONSE = {
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
            "has_profile_image": false,
            "profile_url_full": "https://www.gravatar.com/avatar/3149fb060c93eaff7bd33583e209b5df?r=PG&s=800&d=https%3A%2F%2Fs3.amazonaws.com%2Fodl-micromasters-production%2Favatar_default.png", // eslint-disable-line max-len
            "profile_url_large": "https://www.gravatar.com/avatar/3149fb060c93eaff7bd33583e209b5df?r=PG&s=500&d=https%3A%2F%2Fs3.amazonaws.com%2Fodl-micromasters-production%2Favatar_default.png", // eslint-disable-line max-len
            "profile_url_medium": "https://www.gravatar.com/avatar/3149fb060c93eaff7bd33583e209b5df?r=PG&s=250&d=https%3A%2F%2Fs3.amazonaws.com%2Fodl-micromasters-production%2Favatar_default.png", // eslint-disable-line max-len
            "profile_url_small": "https://www.gravatar.com/avatar/3149fb060c93eaff7bd33583e209b5df?r=PG&s=100&d=https%3A%2F%2Fs3.amazonaws.com%2Fodl-micromasters-production%2Favatar_default.png", // eslint-disable-line max-len
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
};

export const USER_PROFILE_RESPONSE = {
  "username": SETTINGS.username,
  "filled_out": true,
  "agreed_to_terms_of_service": true,
  "account_privacy": "all_users",
  "email_optin": false,
  "first_name": "Jane",
  "last_name": "Garris",
  "preferred_name": "Jane",
  "country": "US",
  "state_or_territory": "MA",
  "city": "Cambridge",
  "birth_country": "US",
  "nationality": "DE",
  "has_profile_image": true,
  "profile_url_full": "http://192.168.33.10:8000/static/images/profiles/default_500.png",
  "profile_url_large": "http://192.168.33.10:8000/static/images/profiles/default_120.png",
  "profile_url_medium": "http://192.168.33.10:8000/static/images/profiles/default_50.png",
  "profile_url_small": "http://192.168.33.10:8000/static/images/profiles/default_30.png",
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
  "edx_level_of_education": null
};

export const USER_PROGRAM_RESPONSE = {
  "grade_average": 83
};

export const STATUS_PASSED = 'passed';
export const STATUS_NOT_PASSED = 'not-passed';
export const STATUS_VERIFIED = 'verified';
export const STATUS_ENROLLED = "enrolled";
export const STATUS_OFFERED = "offered";
export const STATUS_NOT_OFFERED = 'not-offered';

export const ALL_COURSE_STATUSES = [
  STATUS_NOT_OFFERED,
  STATUS_PASSED,
  STATUS_OFFERED,
  STATUS_ENROLLED,
  STATUS_VERIFIED,
];

export const DASHBOARD_RESPONSE = [
  {
    "title": "Empty program",
    "description": "The empty program",
    "courses": [
    ],
    "id": 2
  },
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
            "grade": "0.66",
            "course_id": "course-v1:odl+GIO101+FALL13",
            "id": 3,
            "course_start_date": "2016-08-22T11:48:27Z",
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ],
        "position_in_program": 0,
        "title": "Gio Course - failed, no grade",
        "status": STATUS_NOT_OFFERED,
        "description": "",
        "id": 1
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 1,
        "title": "8.MechCx Advanced Introductory Classical Mechanics",
        "status": STATUS_NOT_OFFERED,
        "description": "",
        "id": 2
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 2,
        "title": "EDX Demo course",
        "status": STATUS_NOT_OFFERED,
        "description": "",
        "id": 3
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 3,
        "title": "Peter Course",
        "status": STATUS_NOT_OFFERED,
        "description": "",
        "id": 4
      }
    ],
    "id": 3
  },
  {
    "courses": [
      {
        "id": 5,
        "status": STATUS_OFFERED,
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
        "status": STATUS_PASSED,
        "position_in_program": 5,
        "title": "Passed course - check mark, grade is 88%",
        "runs": [
          {
            "certificate_url": "www.google.com",
            "course_id": "course-v1:edX+DemoX+Demo_Course",
            "id": 5,
            "status": STATUS_PASSED,
            "title": "Demo course",
            "grade": "0.88",
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
        "status": STATUS_NOT_OFFERED,
        "position_in_program": 2,
        "title": "Empty course - no status text",
        "runs": [
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 8,
        "status": STATUS_ENROLLED,
        "position_in_program": 3,
        "title": "Not verified course - upgrade button",
        "runs": [
          {
            "id": 7,
            "status": STATUS_ENROLLED,
            "title": "Not verified run",
            "course_id": "not-verified",
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
        "id": 10,
        "status": STATUS_OFFERED,
        "position_in_program": 4,
        "title": "Enrollment starting course - disabled enroll button, text says Enrollment begins 3/3/2106",
        "runs": [
          {
            "course_id": "course-v1:supply+chain",
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
        "id": 12,
        "status": STATUS_PASSED,
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
        "status": STATUS_VERIFIED,
        "runs": [
          {
            "id": 13,
            "status": STATUS_VERIFIED,
            "course_start_date": "8765-03-21",
            "title": "First run",
            "position": 0,
            "fuzzy_start_date": "Fall 2017",
            "course_end_date": "2016-09-09T10:20:10Z",
          }
        ]
      },
      {
        "id": 11,
        "status": STATUS_OFFERED,
        "position_in_program": 0,
        "title": "Fuzzy enrollment starting course - First in program, action text is enrollment begins soonish",
        "runs": [
          {
            "course_id": "course-v1:supply+chain",
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
    ],
    "title": "Master Program",
    "description": null,
    "id": 4
  },
  {
    "title": "Last program",
    "description": "The last program",
    "courses": [
      {
        "id": 9,
        "status": STATUS_VERIFIED,
        "position_in_program": 0,
        "title": "Course for last program in progress - no grade, action or description",
        "runs": [
          {
            "course_id": "course-v1:edX+DemoX+Demo_Course",
            "id": 6,
            "status": STATUS_VERIFIED,
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
    "id": 5
  },
];

export const ERROR_RESPONSE = {
  "errorStatusCode": 500,
  "error_code": "AB123",
  "user_message": "custom error message for the user."
};

export const ISO_8601_FORMAT = 'YYYY-MM-DD';
export const DASHBOARD_FORMAT = 'M/D/Y';

// NOTE: this is in order of attainment
export const EDUCATION_LEVELS = [
  {value: HIGH_SCHOOL, label: "High school"},
  {value: ASSOCIATE, label: 'Associate degree'},
  {value: BACHELORS, label: "Bachelor's degree"},
  {value: MASTERS, label: "Master's or professional degree"},
  {value: DOCTORATE, label: "Doctorate"}
];

export const PERSONAL_STEP = 'personal';
export const EMPLOYMENT_STEP = 'employment';
export const EDUCATION_STEP = 'education';
export const PRIVACY_STEP = 'privacy';

export const PROFILE_STEP_LABELS = new Map([
  [PERSONAL_STEP, "Personal"],
  [EDUCATION_STEP, "Education"],
  [EMPLOYMENT_STEP, "Professional"],
  [PRIVACY_STEP, "Profile Privacy"]
]);

export const DEFAULT_OPTION_LIMIT_COUNT = 10;

/* eslint-disable max-len */
export const CHECKOUT_RESPONSE = {
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
  "url": "https://testsecureacceptance.cybersource.com/pay"
};
/* eslint-enable max-len */

export const PROGRAM_ENROLLMENTS = [
  {
    id: DASHBOARD_RESPONSE[1].id,
    title: DASHBOARD_RESPONSE[1].title
  },
  {
    id: DASHBOARD_RESPONSE[2].id,
    title: DASHBOARD_RESPONSE[2].title
  },
];

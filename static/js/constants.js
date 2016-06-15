export const HIGH_SCHOOL = 'hs';
export const ASSOCIATE = 'a';
export const BACHELORS = 'b';
export const MASTERS = 'm';
export const DOCTORATE = 'p';

export const USER_PROFILE_RESPONSE = {
  "filled_out": true,
  "agreed_to_terms_of_service": true,
  "account_privacy": "all_users",
  "email_optin": false,
  "first_name": "Jane",
  "last_name": "Garris",
  "preferred_name": "Jane Garris",
  "country": "US",
  "state_or_territory": "MA",
  "city": "Cambridge",
  "birth_country": "US",
  "birth_state_or_territory": "MA",
  "birth_city": "Cambridge",
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

export const STATUS_PASSED = 'passed';
export const STATUS_NOT_PASSED = 'not-passed';
export const STATUS_VERIFIED_NOT_COMPLETED = 'verified-not-completed';
export const STATUS_ENROLLED_NOT_VERIFIED = "enrolled-not-verified";
export const STATUS_OFFERED_NOT_ENROLLED = "offered-not-enrolled";
export const STATUS_NOT_OFFERED = 'not-offered';

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
            "id": 1
          },
          {
            "position": 2,
            "title": "Gio Test Course #14",
            "course_id": "course-v1:odl+GIO101+FALL14",
            "status": STATUS_NOT_PASSED,
            "id": 2
          },
          {
            "certificate_url": "www.google.com",
            "title": "Gio Test Course #13",
            "status": STATUS_PASSED,
            "position": 3,
            "grade": "0.66",
            "course_id": "course-v1:odl+GIO101+FALL13",
            "id": 3
          }
        ],
        "position_in_program": 0,
        "title": "Gio Course - failed, no status text",
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
        "status": STATUS_OFFERED_NOT_ENROLLED,
        "position_in_program": 1,
        "title": "Supply Chain and Logistics Fundamentals - enroll button",
        "runs": [
          {
            "course_id": "course-v1:supply+chain",
            "id": 4,
            "status": STATUS_OFFERED_NOT_ENROLLED,
            "fuzzy_enrollment_start_date": null,
            "title": "Supply Chain Design",
            "enrollment_start_date": "2016-03-04T01:00:00Z",
            "position": 0
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 6,
        "status": STATUS_PASSED,
        "position_in_program": 5,
        "title": "Passed course - status text is 88%",
        "runs": [
          {
            "certificate_url": "www.google.com",
            "course_id": "course-v1:edX+DemoX+Demo_Course",
            "id": 5,
            "status": STATUS_PASSED,
            "title": "Demo course",
            "grade": "0.88",
            "position": 0
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
        "status": STATUS_ENROLLED_NOT_VERIFIED,
        "position_in_program": 3,
        "title": "Not verified course - upgrade to verified button",
        "runs": [
          {
            "id": 7,
            "status": STATUS_ENROLLED_NOT_VERIFIED,
            "title": "Not verified run",
            "verification_date": "2200-01-01T03:00:00Z",
            "course_id": "not-verified",
            "position": 0
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 10,
        "status": STATUS_OFFERED_NOT_ENROLLED,
        "position_in_program": 4,
        "title": "Enrollment starting course - status text says Enrollment starting",
        "runs": [
          {
            "course_id": "course-v1:supply+chain",
            "id": 8,
            "status": STATUS_OFFERED_NOT_ENROLLED,
            "fuzzy_enrollment_start_date": null,
            "title": "Enrollment starting run",
            "enrollment_start_date": "2106-03-04T01:00:00Z",
            "position": 0
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 12,
        "status": STATUS_PASSED,
        "title": "Passed course missing grade - no status text",
        "position_in_program": 6,
        "runs": [
          {
            "certificate_url": "www.google.com",
            "title": "Passed run missing grade",
            "status": STATUS_PASSED,
            "position": 0,
            "course_id": "course_id",
            "id": 10
          }
        ]
      },
      {
        "id": 13,
        "status": STATUS_ENROLLED_NOT_VERIFIED,
        "title": "Enrolled, no verification date - no status text",
        "position_in_program": 7,
        "runs": [
          {
            "title": "Enrolled no verification date",
            "status": STATUS_ENROLLED_NOT_VERIFIED,
            "position": 0,
            "course_id": "course_id",
            "id": 11
          }
        ]
      },
      {
        "id": 14,
        "position_in_program": 8,
        "title": "enrolled not verified, verification date passed - no status text",
        "status": STATUS_ENROLLED_NOT_VERIFIED,
        "runs": [
          {
            "position": 0,
            "id": 12,
            "status": STATUS_ENROLLED_NOT_VERIFIED,
            "title": "enrolled not verified, verification date passed",
            "verification_date": "2000-01-01"
          }
        ]
      },
      {
        "id": 15,
        "position_in_program": 9,
        "title": "verified not completed, course starts in future - status text is Course starting",
        "status": STATUS_VERIFIED_NOT_COMPLETED,
        "runs": [
          {
            "id": 13,
            "status": STATUS_VERIFIED_NOT_COMPLETED,
            "course_start_date": "8765-03-21",
            "title": "First run",
            "position": 0
          }
        ]
      },
      {
        "id": 11,
        "status": STATUS_OFFERED_NOT_ENROLLED,
        "position_in_program": 0,
        "title": "Fuzzy enrollment starting course - First in program, status text is soonish",
        "runs": [
          {
            "course_id": "course-v1:supply+chain",
            "id": 9,
            "status": STATUS_OFFERED_NOT_ENROLLED,
            "fuzzy_enrollment_start_date": "soonish",
            "title": "Fuzzy enrollment starting run",
            "position": 0
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
        "status": STATUS_VERIFIED_NOT_COMPLETED,
        "position_in_program": 0,
        "title": "Course for last program, no grade - in progress, status text is 0%",
        "runs": [
          {
            "course_id": "course-v1:edX+DemoX+Demo_Course",
            "id": 6,
            "status": STATUS_VERIFIED_NOT_COMPLETED,
            "title": "Course run for last program",
            "position": 0,
            "course_start_date": "2016-01-01",
          }
        ],
        "description": "Course for Last program",
        "prerequisites": ""
      },
    ],
    "id": 5
  },
];

export const DASHBOARD_RESPONSE_ERROR = {
  "errorStatusCode": 500,
  "error_code": "AB123",
  "user_message": "custom error message for the user."
};

export const ISO_8601_FORMAT = 'YYYY-MM-DD';

export const DASHBOARD_COURSE_HEIGHT = 70;
export const TERMS_CARD_ROW_HEIGHT = 70;
export const DASHBOARD_RUN_HEIGHT = 40;

// NOTE: this is in order of attainment
export const EDUCATION_LEVELS = [
  {value: HIGH_SCHOOL, label: "High school"},
  {value: ASSOCIATE, label: 'Associate degree'},
  {value: BACHELORS, label: "Bachelor's degree"},
  {value: MASTERS, label: "Master's or professional degree"},
  {value: DOCTORATE, label: "Doctorate"}
];

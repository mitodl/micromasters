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
    "end_date": "7654-03-21"
  }, {
    "id": 2,
    "city": "New York",
    "state_or_territory": "US-NY",
    "country": "US",
    "company_name": "Planet Express",
    "position": "Delivery",
    "industry": "Shipping",
    "start_date": "3000-01-01",
    "end_date": "4000-01-01"
  }],
  "education": [{
    "id": 1,
    "degree_name": HIGH_SCHOOL,
    "graduation_date": "2013-05-01",
    "field_of_study": "Computer Science",
    "school_name": "MIT",
    "school_city": "Cambridge",
    "school_state_or_territory": "US-MA",
    "school_country": "US"
  }, {
    "id": 2,
    "degree_name": BACHELORS,
    "graduation_date": "1975-12-01",
    "field_of_study": "Philosophy",
    "school_name": "Harvard",
    "school_city": "Cambridge",
    "school_state_or_territory": "US-MA",
    "school_country": "US"
  }]
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
            "status": "not-passed",
            "id": 199
          },
          {
            "position": 2,
            "title": "Gio Test Course #14",
            "course_id": "course-v1:odl+GIO101+FALL14",
            "status": "not-passed",
            "id": 399
          },
          {
            "certificate_url": "www.google.com",
            "title": "Gio Test Course #13",
            "status": "passed",
            "position": 3,
            "grade": "0.66",
            "course_id": "course-v1:odl+GIO101+FALL13",
            "id": 299
          }
        ],
        "position_in_program": 0,
        "title": "Gio Course",
        "status": "not-offered",
        "description": "",
        "id": 199
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 1,
        "title": "8.MechCx Advanced Introductory Classical Mechanics",
        "status": "not-offered",
        "description": "",
        "id": 299
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 2,
        "title": "EDX Demo course",
        "status": "not-offered",
        "description": "",
        "id": 399
      },
      {
        "prerequisites": "",
        "runs": [],
        "position_in_program": 3,
        "title": "Peter Course",
        "status": "not-offered",
        "description": "",
        "id": 499
      }
    ],
    "id": 799
  },
  {
    "courses": [
      {
        "id": 3,
        "status": STATUS_OFFERED_NOT_ENROLLED,
        "position_in_program": 1,
        "title": "Supply Chain and Logistics Fundamentals",
        "runs": [
          {
            "course_id": null,
            "id": 3,
            "status": STATUS_OFFERED_NOT_ENROLLED,
            "fuzzy_enrollment_start_date": null,
            "title": "Supply Chain Design",
            "enrollment_start_date": "2016-03-04T01:00:00Z"
          }
        ],
        "description": null,
        "prerequisites": null
      },
      {
        "id": 4,
        "status": STATUS_PASSED,
        "position_in_program": 0,
        "title": "Demo course",
        "runs": [
          {
            "certificate_url": "www.google.com",
            "course_id": "course-v1:edX+DemoX+Demo_Course",
            "id": 4,
            "status": STATUS_PASSED,
            "title": "Demo course",
            "grade": "0.88"
          }
        ],
        "description": "The demo course",
        "prerequisites": ""
      },
      {
        "id": 5,
        "status": STATUS_NOT_OFFERED,
        "position_in_program": 2,
        "title": "Empty course",
        "runs": [
        ],
        "description": null,
        "prerequisites": null
      },
    ],
    "title": "Master Program",
    "description": null,
    "id": 1
  },
  {
    "title": "Last program",
    "description": "The last program",
    "courses": [
      {
        "id": 4,
        "status": STATUS_VERIFIED_NOT_COMPLETED,
        "position_in_program": 0,
        "title": "Course for last program",
        "runs": [
          {
            "course_id": "course-v1:edX+DemoX+Demo_Course",
            "id": 4,
            "status": STATUS_VERIFIED_NOT_COMPLETED,
            "title": "Course run for last program"
          }
        ],
        "description": "Course for Last program",
        "prerequisites": ""
      },
    ],
    "id": 3
  },
];

export const DATE_FORMAT = 'YYYY-MM-DD';

export const DASHBOARD_COURSE_HEIGHT = 70;
export const DASHBOARD_RUN_HEIGHT = 40;

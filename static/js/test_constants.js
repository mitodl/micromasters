/* global SETTINGS: false */
// @flow
import deepFreeze from 'deep-freeze';
import Decimal from 'decimal.js-light';

import type {
  CoursePrices,
  Dashboard,
} from './flow/dashboardTypes';
import type { AvailablePrograms } from './flow/enrollmentTypes';
import type { FinancialAidUserInfo } from './flow/programTypes';
import {
  HIGH_SCHOOL,
  BACHELORS,
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_CAN_UPGRADE,
  STATUS_MISSED_DEADLINE,
  STATUS_OFFERED,
  STATUS_PAID_BUT_NOT_ENROLLED,
  STATUS_PENDING_ENROLLMENT,
  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
  COUPON_CONTENT_TYPE_PROGRAM,
} from './constants';

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
            "full_name": "Test User",
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
      },
      { // worse-case profile with null props
        "_index": "micromasters",
        "_type": "user",
        "_id": "4",
        "_score": 1,
        "_source": {
          "profile": {
            "username": null,
            "filled_out": true,
            "account_privacy": null,
            "email_optin": true,
            "first_name": null,
            "last_name": null,
            "preferred_name": null,
            "country": null,
            "state_or_territory": null,
            "city": null,
            "birth_country": null,
            "nationality": null,
            "date_of_birth": null,
            "preferred_language": null,
            "gender": null,
            "pretty_printed_student_id": null,
            "work_history": [
              {
                "id": 15,
                "city": null,
                "state_or_territory": null,
                "country": null,
                "company_name": null,
                "position": null,
                "industry": null,
                "end_date": null,
                "start_date": null
              }
            ],
            "edx_level_of_education": null,
            "education": [
              {
                "id": 12,
                "degree_name": null,
                "graduation_date": null,
                "field_of_study": null,
                "online_degree": false,
                "school_name": null,
                "school_city": null,
                "school_state_or_territory": null,
                "school_country": null
              }
            ]
          },
          "id": 4
        }
      },
      { // extreme worst-case empty profile
        '_source': {
          "profile": {}
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
            },
            {
              "key": null,
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
  "romanized_first_name": "Rjane",
  "romanized_last_name": "Rgarris",
  "preferred_name": "Jane",
  "country": "US",
  "address": "123 Main Street",
  "state_or_territory": "MA",
  "city": "Cambridge",
  "postal_code": "02139",
  "birth_country": "US",
  "nationality": "DE",
  "date_of_birth": '1984-04-13',
  "preferred_language": 'en',
  "gender": "f",
  "pretty_printed_student_id": "MMM000011",
  "phone_number": "+1 (234) 567-8910",
  "student_id": 123,
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

export const DASHBOARD_RESPONSE: Dashboard = deepFreeze({
  "is_edx_data_fresh": true,
  "programs": [
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
      "financial_aid_availability": false,
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
          "id": 12,
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
      "financial_aid_availability": false,
      "title": "Empty program",
      "description": "The empty program",
      "courses": [
      ],
      "id": 2
    },
    {
      "title": "Last program",
      "description": "The last program",
      "pearson_exam_status": "",
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
    {
      "title": "Paid but not enrolled",
      "description": "Paid but not enrolled",
      "courses": [{
        "id": 24,
        "position_in_program": 1,
        "title": "Course for paid but not enrolled program",
        "description": "Course for paid but not enrolled program",
        "prerequisites": "",
        "runs": [{
          "position": 1,
          "course_id": "course-v1:MITx+paid+not+enrolled+100+Jan_2015",
          "id": 66,
          "course_start_date": "2016-12-20T00:00:00Z",
          "course_end_date": "2018-05-15T00:00:00Z",
          "enrollment_url": "",
          "fuzzy_start_date": "",
          "current_grade": null,
          "title": "Digital Learning 100 - January 2015",
          "status": STATUS_PAID_BUT_NOT_ENROLLED
        }]
      }],
      "financial_aid_availability": true,
      "id": 7
    },
  ]
});

export const PROGRAMS: AvailablePrograms = deepFreeze(DASHBOARD_RESPONSE.programs.map(program => ({
  id: program.id,
  title: program.title,
  programpage_url: `/program${program.id}/`,
  enrolled: true
})));

export const FINANCIAL_AID_PARTIAL_RESPONSE: FinancialAidUserInfo = deepFreeze({
  application_status: null,
  has_user_applied: false,
  max_possible_cost: 1000,
  min_possible_cost: 1000
});

export const COURSE_PRICES_RESPONSE: CoursePrices = deepFreeze(DASHBOARD_RESPONSE.programs.map(program => ({
  program_id: program.id,
  price: Decimal(program.id * 1000),
  financial_aid_availability: false,
  has_financial_aid_request: false
})));

export const ERROR_RESPONSE = deepFreeze({
  errorStatusCode: 500,
  error_code: "AB123",
  user_message: "custom error message for the user."
});

export const ATTACH_COUPON_RESPONSE = deepFreeze({
  message: "Attached user to coupon successfully.",
  coupon: {
    amount: Decimal("0.55"),
    amount_type: COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
    content_type: COUPON_CONTENT_TYPE_PROGRAM,
    coupon_code: "success-coupon",
    object_id: 3,
    program_id: 3,
  }
});

export const COUPON = deepFreeze(ATTACH_COUPON_RESPONSE.coupon);

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
  "url": "http://edx.org/",
  "method": "GET"
});
/* eslint-enable max-len */

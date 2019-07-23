// @flow
/* global SETTINGS: false */
import deepFreeze from "deep-freeze"
import Decimal from "decimal.js-light"

import type {
  CoursePrices,
  Dashboard,
  ProgramLearners
} from "./flow/dashboardTypes"
import type { AvailablePrograms } from "./flow/enrollmentTypes"
import type { FinancialAidUserInfo } from "./flow/programTypes"
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
  COUPON_CONTENT_TYPE_PROGRAM
} from "./constants"

export const ELASTICSEARCH_RESPONSE = deepFreeze({
  took:      48,
  timed_out: false,
  _shards:   {
    total:      5,
    successful: 5,
    failed:     0
  },
  hits: {
    total:     66,
    max_score: null,
    hits:      [
      {
        _index:  "micromasters_334c64b09c6d47e38854ba0649bf18fc",
        _type:   "program_user",
        _id:     "214",
        _score:  null,
        _source: {
          id:      214,
          user_id: 210,
          email:   "xavier.addy@example.com",
          profile: {
            username:                   "fake.xavier.addy",
            filled_out:                 true,
            agreed_to_terms_of_service: false,
            account_privacy:            "private",
            email_optin:                true,
            email:                      "xavier.addy@example.com",
            first_name:                 "othername",
            last_name:                  "Addy",
            full_name:                  "othername Addy",
            preferred_name:             "Xavier",
            country:                    "US",
            state_or_territory:         "US-ND",
            city:                       "Temecula",
            address:                    null,
            postal_code:                null,
            birth_country:              "CA",
            nationality:                "CA",
            date_of_birth:              "1986-06-15",
            preferred_language:         null,
            gender:                     "m",
            pretty_printed_student_id:  "MMM000210",
            student_id:                 210,
            work_history:               [
              {
                id:                 314,
                city:               "Stirling",
                state_or_territory: "CA-NS",
                country:            "CA",
                company_name:       "Volvo",
                position:           "Mechanic",
                industry:           "Automotive",
                end_date:           null,
                start_date:         "2015-01-17"
              }
            ],
            edx_level_of_education: null,
            education:              [
              {
                id:                        589,
                degree_name:               "m",
                graduation_date:           "2016-06-15",
                field_of_study:            "28.0799",
                online_degree:             false,
                school_name:               "Stirling University",
                school_city:               "Stirling",
                school_state_or_territory: "CA-NS",
                school_country:            "CA"
              },
              {
                id:                        588,
                degree_name:               "b",
                graduation_date:           "2008-06-15",
                field_of_study:            "05.0114",
                online_degree:             false,
                school_name:               "Stirling University",
                school_city:               "Stirling",
                school_state_or_territory: "CA-NS",
                school_country:            "CA"
              },
              {
                id:                        587,
                degree_name:               "hs",
                graduation_date:           "2004-06-15",
                field_of_study:            "45.1201",
                online_degree:             false,
                school_name:               "Stirling High School",
                school_city:               "Stirling",
                school_state_or_territory: "CA-NS",
                school_country:            "CA"
              }
            ],
            image:                null,
            image_small:          null,
            image_medium:         null,
            about_me:             null,
            romanized_first_name: null,
            romanized_last_name:  null,
            phone_number:         null
          },
          program: {
            id:          34,
            enrollments: [
              {
                final_grade:    86.0,
                semester:       "2017 - Fall",
                course_title:   "Digital Learning 100",
                payment_status: "Auditing"
              }
            ],
            grade_average:      86,
            is_learner:         true,
            num_courses_passed: 1,
            total_courses:      3
          }
        },
        sort: ["Addy", "othername"]
      },
      {
        _index:  "micromasters_334c64b09c6d47e38854ba0649bf18fc",
        _type:   "program_user",
        _id:     "232",
        _score:  null,
        _source: {
          id:      232,
          user_id: 227,
          email:   "concepcion.alonso@example.com",
          profile: {
            username:                   "fake.concepcion.alonso",
            filled_out:                 true,
            agreed_to_terms_of_service: false,
            account_privacy:            "private",
            email_optin:                true,
            email:                      "concepcion.alonso@example.com",
            first_name:                 "Concepcion",
            last_name:                  "Alonso",
            full_name:                  "Concepcion Alonso",
            preferred_name:             "Concepcion",
            country:                    "ES",
            state_or_territory:         "ES-EX",
            city:                       "Albacete",
            address:                    null,
            postal_code:                null,
            birth_country:              "ES",
            nationality:                "ES",
            date_of_birth:              "1974-11-11",
            preferred_language:         null,
            gender:                     "f",
            pretty_printed_student_id:  "MMM000227",
            student_id:                 227,
            work_history:               [
              {
                id:                 339,
                city:               "Albacete",
                state_or_territory: "ES-EX",
                country:            "ES",
                company_name:       "Chase",
                position:           "Branch Manager",
                industry:           "Banking",
                end_date:           null,
                start_date:         "2015-01-17"
              }
            ],
            edx_level_of_education: null,
            education:              [
              {
                id:                        638,
                degree_name:               "m",
                graduation_date:           "2004-11-11",
                field_of_study:            "52.0406",
                online_degree:             false,
                school_name:               "Albacete University",
                school_city:               "Albacete",
                school_state_or_territory: "ES-EX",
                school_country:            "ES"
              },
              {
                id:                        637,
                degree_name:               "b",
                graduation_date:           "1996-11-11",
                field_of_study:            "46.0504",
                online_degree:             false,
                school_name:               "Albacete University",
                school_city:               "Albacete",
                school_state_or_territory: "ES-EX",
                school_country:            "ES"
              },
              {
                id:                        636,
                degree_name:               "hs",
                graduation_date:           "1992-11-11",
                field_of_study:            "16.0801",
                online_degree:             false,
                school_name:               "Albacete High School",
                school_city:               "Albacete",
                school_state_or_territory: "ES-EX",
                school_country:            "ES"
              }
            ],
            image:                null,
            image_small:          null,
            image_medium:         null,
            about_me:             null,
            romanized_first_name: null,
            romanized_last_name:  null,
            phone_number:         null
          },
          program: {
            id:          34,
            enrollments: [
              {
                final_grade:    98.0,
                semester:       "2017 - Fall",
                course_title:   "Digital Learning 100",
                payment_status: "Auditing"
              }
            ],
            grade_average:      98,
            is_learner:         true,
            num_courses_passed: 1,
            total_courses:      3
          }
        },
        sort: ["Alonso", "Concepcion"]
      },
      {
        // extreme worst-case empty profile
        _source: {
          profile: {}
        },
        _id: 999
      }
    ]
  },
  aggregations: {
    "program.courses.course_title2": {
      doc_count: 66,
      inner:     {
        doc_count:                            100,
        "program.courses.course_title_count": {
          value: 3
        },
        "program.courses.course_title": {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count:         0,
          buckets:                     [
            {
              key:                 "Digital Learning 100",
              doc_count:           65,
              top_level_doc_count: {
                doc_count: 65
              }
            },
            {
              key:                 "Digital Learning 200",
              doc_count:           31,
              top_level_doc_count: {
                doc_count: 31
              }
            },
            {
              key:                 "Digital Learning 300",
              doc_count:           4,
              top_level_doc_count: {
                doc_count: 4
              }
            }
          ]
        }
      }
    },
    country: {
      doc_count:         66,
      "profile.country": {
        doc_count:         66,
        "profile.country": {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count:         0,
          buckets:                     [
            {
              key:       "ES",
              doc_count: 23
            },
            {
              key:       "CA",
              doc_count: 22
            },
            {
              key:       "US",
              doc_count: 21
            }
          ]
        }
      }
    },
    company_name11: {
      doc_count: 66,
      inner:     {
        doc_count:                                 66,
        "profile.work_history.company_name_count": {
          value: 16
        },
        "profile.work_history.company_name": {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count:         0,
          buckets:                     [
            {
              key:                "Hyundai",
              doc_count:          7,
              company_name_count: {
                doc_count: 7,
                count:     {
                  value: 7
                }
              }
            },
            {
              key:                "Chase",
              doc_count:          6,
              company_name_count: {
                doc_count: 6,
                count:     {
                  value: 6
                }
              }
            },
            {
              key:                "Goldman Sachs",
              doc_count:          6,
              company_name_count: {
                doc_count: 6,
                count:     {
                  value: 6
                }
              }
            },
            {
              key:                "Google",
              doc_count:          6,
              company_name_count: {
                doc_count: 6,
                count:     {
                  value: 6
                }
              }
            },
            {
              key:                "Volvo",
              doc_count:          6,
              company_name_count: {
                doc_count: 6,
                count:     {
                  value: 6
                }
              }
            },
            {
              key:                "Ford",
              doc_count:          5,
              company_name_count: {
                doc_count: 5,
                count:     {
                  value: 5
                }
              }
            },
            {
              key:                "TD Bank",
              doc_count:          5,
              company_name_count: {
                doc_count: 5,
                count:     {
                  value: 5
                }
              }
            },
            {
              key:                "Toyota",
              doc_count:          5,
              company_name_count: {
                doc_count: 5,
                count:     {
                  value: 5
                }
              }
            },
            {
              key:                "Apple",
              doc_count:          4,
              company_name_count: {
                doc_count: 4,
                count:     {
                  value: 4
                }
              }
            },
            {
              key:                "Microsoft",
              doc_count:          4,
              company_name_count: {
                doc_count: 4,
                count:     {
                  value: 4
                }
              }
            },
            {
              key:                "Berkshire Hathaway",
              doc_count:          3,
              company_name_count: {
                doc_count: 3,
                count:     {
                  value: 3
                }
              }
            },
            {
              key:                "Fidelity",
              doc_count:          3,
              company_name_count: {
                doc_count: 3,
                count:     {
                  value: 3
                }
              }
            },
            {
              key:                "Bank of America",
              doc_count:          2,
              company_name_count: {
                doc_count: 2,
                count:     {
                  value: 2
                }
              }
            },
            {
              key:                "Vanguard",
              doc_count:          2,
              company_name_count: {
                doc_count: 2,
                count:     {
                  value: 2
                }
              }
            },
            {
              key:                "Audi",
              doc_count:          1,
              company_name_count: {
                doc_count: 1,
                count:     {
                  value: 1
                }
              }
            },
            {
              key:                "ME",
              doc_count:          1,
              company_name_count: {
                doc_count: 1,
                count:     {
                  value: 1
                }
              }
            }
          ]
        }
      }
    },
    "final-grade": {
      doc_count: 66,
      inner:     {
        doc_count:     100,
        "final-grade": {
          buckets: [
            {
              key:       0,
              doc_count: 0
            },
            {
              key:       5,
              doc_count: 0
            },
            {
              key:       10,
              doc_count: 0
            },
            {
              key:       15,
              doc_count: 0
            },
            {
              key:       20,
              doc_count: 0
            },
            {
              key:       25,
              doc_count: 0
            },
            {
              key:       30,
              doc_count: 0
            },
            {
              key:       35,
              doc_count: 0
            },
            {
              key:       40,
              doc_count: 0
            },
            {
              key:       45,
              doc_count: 0
            },
            {
              key:       50,
              doc_count: 0
            },
            {
              key:       55,
              doc_count: 0
            },
            {
              key:       60,
              doc_count: 9
            },
            {
              key:       65,
              doc_count: 15
            },
            {
              key:       70,
              doc_count: 11
            },
            {
              key:       75,
              doc_count: 8
            },
            {
              key:       80,
              doc_count: 18
            },
            {
              key:       85,
              doc_count: 12
            },
            {
              key:       90,
              doc_count: 9
            },
            {
              key:       95,
              doc_count: 13
            },
            {
              key:       100,
              doc_count: 0
            }
          ]
        }
      }
    },
    "num-courses-passed6": {
      doc_count:            66,
      "num-courses-passed": {
        value: 4
      }
    },
    education_level10: {
      doc_count: 66,
      inner:     {
        doc_count:                       186,
        "profile.education.degree_name": {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count:         0,
          buckets:                     [
            {
              key:               "hs",
              doc_count:         65,
              school_name_count: {
                doc_count: 65,
                count:     {
                  value: 65
                }
              }
            },
            {
              key:               "b",
              doc_count:         64,
              school_name_count: {
                doc_count: 64,
                count:     {
                  value: 64
                }
              }
            },
            {
              key:               "m",
              doc_count:         57,
              school_name_count: {
                doc_count: 57,
                count:     {
                  value: 57
                }
              }
            }
          ]
        },
        "profile.education.degree_name_count": {
          value: 3
        }
      }
    },
    "program.courses.semester5": {
      doc_count: 66,
      inner:     {
        doc_count:                        100,
        "program.courses.semester_count": {
          value: 3
        },
        "program.courses.semester": {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count:         0,
          buckets:                     [
            {
              key:                 "2017 - Fall",
              doc_count:           65,
              top_level_doc_count: {
                doc_count: 65
              }
            },
            {
              key:                 "2016 - Spring",
              doc_count:           31,
              top_level_doc_count: {
                doc_count: 31
              }
            },
            {
              key:                 "2015 - Summer",
              doc_count:           4,
              top_level_doc_count: {
                doc_count: 4
              }
            }
          ]
        }
      }
    },
    "grade-average7": {
      doc_count:       65,
      "grade-average": {
        buckets: [
          {
            key:       0,
            doc_count: 0
          },
          {
            key:       5,
            doc_count: 0
          },
          {
            key:       10,
            doc_count: 0
          },
          {
            key:       15,
            doc_count: 0
          },
          {
            key:       20,
            doc_count: 0
          },
          {
            key:       25,
            doc_count: 0
          },
          {
            key:       30,
            doc_count: 0
          },
          {
            key:       35,
            doc_count: 0
          },
          {
            key:       40,
            doc_count: 0
          },
          {
            key:       45,
            doc_count: 0
          },
          {
            key:       50,
            doc_count: 0
          },
          {
            key:       55,
            doc_count: 0
          },
          {
            key:       60,
            doc_count: 3
          },
          {
            key:       65,
            doc_count: 10
          },
          {
            key:       70,
            doc_count: 6
          },
          {
            key:       75,
            doc_count: 7
          },
          {
            key:       80,
            doc_count: 19
          },
          {
            key:       85,
            doc_count: 6
          },
          {
            key:       90,
            doc_count: 6
          },
          {
            key:       95,
            doc_count: 8
          },
          {
            key:       100,
            doc_count: 0
          }
        ]
      }
    },
    "program.courses.payment_status4": {
      doc_count: 66,
      inner:     {
        doc_count:                        100,
        "program.courses.payment_status": {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count:         0,
          buckets:                     [
            {
              key:                 "Auditing",
              doc_count:           65,
              top_level_doc_count: {
                doc_count: 65
              }
            },
            {
              key:                 "Paid",
              doc_count:           35,
              top_level_doc_count: {
                doc_count: 31
              }
            }
          ]
        },
        "program.courses.payment_status_count": {
          value: 2
        }
      }
    },
    birth_location8: {
      doc_count:                     66,
      "profile.birth_country_count": {
        value: 4
      },
      "profile.birth_country": {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count:         0,
        buckets:                     [
          {
            key:       "ES",
            doc_count: 23
          },
          {
            key:       "CA",
            doc_count: 21
          },
          {
            key:       "US",
            doc_count: 21
          },
          {
            key:       "DZ",
            doc_count: 1
          }
        ]
      }
    }
  }
})

export const USER_PROFILE_RESPONSE = deepFreeze({
  image:                      "some_sort_of_image.png",
  username:                   SETTINGS.user ? SETTINGS.user.username : null,
  filled_out:                 true,
  agreed_to_terms_of_service: true,
  account_privacy:            "all_users",
  email:                      "jane@foobar.baz",
  email_optin:                false,
  first_name:                 "Jane",
  last_name:                  "Garris",
  romanized_first_name:       "Rjane",
  romanized_last_name:        "Rgarris",
  preferred_name:             "Jane",
  country:                    "US",
  address:                    "123 Main Street",
  state_or_territory:         "MA",
  city:                       "Cambridge",
  postal_code:                "02139",
  birth_country:              "US",
  nationality:                "DE",
  date_of_birth:              "1984-04-13",
  preferred_language:         "en",
  gender:                     "f",
  pretty_printed_student_id:  "MMM000011",
  phone_number:               "+1 (234) 567-8910",
  student_id:                 123,
  work_history:               [
    {
      id:                 1,
      city:               "Cambridge",
      state_or_territory: "US-MA",
      country:            "US",
      company_name:       "MIT",
      position:           "Software Developer",
      industry:           "Education",
      start_date:         "1982-02-02",
      end_date:           "1982-03-21"
    },
    {
      id:                 2,
      city:               "New York",
      state_or_territory: "US-NY",
      country:            "US",
      company_name:       "Planet Express",
      position:           "Delivery",
      industry:           "Shipping",
      start_date:         "1999-03-28",
      end_date:           "2013-09-04"
    }
  ],
  education: [
    {
      id:                        1,
      degree_name:               HIGH_SCHOOL,
      graduation_date:           "2013-05-01",
      field_of_study:            "Computer Science",
      school_name:               "MIT",
      school_city:               "Cambridge",
      school_state_or_territory: "US-MA",
      school_country:            "US",
      online_degree:             false
    },
    {
      id:                        2,
      degree_name:               BACHELORS,
      graduation_date:           "1975-12-01",
      field_of_study:            "Philosophy",
      school_name:               "Harvard",
      school_city:               "Cambridge",
      school_state_or_territory: "US-MA",
      school_country:            "US",
      online_degree:             false
    }
  ],
  edx_level_of_education: null
})

export const USER_PROGRAM_RESPONSE = deepFreeze({
  id:            1,
  grade_average: 83
})

export const DASHBOARD_RESPONSE: Dashboard = deepFreeze({
  is_edx_data_fresh: true,
  programs:          [
    {
      description:             "Not passed program",
      title:                   "Not passed program",
      number_courses_required: 4,
      courses:                 [
        {
          prerequisites: "",
          runs:          [
            {
              position:          1,
              title:             "Gio Test Course #15",
              course_id:         "course-v1:odl+GIO101+CR-FALL15",
              status:            STATUS_NOT_PASSED,
              id:                1,
              course_start_date: "2016-09-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2016",
              course_end_date:   "2016-09-09T10:20:10Z"
            },
            {
              position:          2,
              title:             "Gio Test Course #14",
              course_id:         "course-v1:odl+GIO101+FALL14",
              status:            STATUS_NOT_PASSED,
              final_grade:       "33",
              id:                2,
              course_start_date: "2016-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z"
            },
            {
              certificate_url:   "www.google.com",
              title:             "Gio Test Course #13",
              status:            STATUS_PASSED,
              position:          3,
              final_grade:       "66",
              course_id:         "course-v1:odl+GIO101+FALL13",
              id:                3,
              course_start_date: "2016-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z"
            }
          ],
          position_in_program:     0,
          title:                   "Gio Course - failed, no grade",
          description:             "",
          id:                      1,
          proctorate_exams_grades: []
        },
        {
          prerequisites:           "",
          runs:                    [],
          proctorate_exams_grades: [],
          position_in_program:     1,
          title:                   "8.MechCx Advanced Introductory Classical Mechanics",
          description:             "",
          id:                      2
        },
        {
          prerequisites:           "",
          runs:                    [],
          position_in_program:     2,
          title:                   "EDX Demo course",
          description:             "",
          id:                      3,
          proctorate_exams_grades: []
        },
        {
          prerequisites:           "",
          runs:                    [],
          position_in_program:     3,
          title:                   "Peter Course",
          description:             "",
          id:                      4,
          proctorate_exams_grades: []
        }
      ],
      financial_aid_availability: false,
      id:                         3
    },
    {
      courses: [
        {
          id:                  5,
          position_in_program: 1,
          title:               "Supply Chain and Logistics Fundamentals - enroll button",
          runs:                [
            {
              course_id:                   "course-v1:supply+chain",
              id:                          4,
              status:                      STATUS_OFFERED,
              fuzzy_enrollment_start_date: null,
              title:                       "Supply Chain Design",
              enrollment_start_date:       "2016-03-04T01:00:00Z",
              position:                    0,
              price:                       50.0,
              course_start_date:           "2016-08-22T11:48:27Z",
              fuzzy_start_date:            "Fall 2017",
              course_end_date:             "2016-09-09T10:20:10Z"
            }
          ],
          description:             null,
          prerequisites:           null,
          proctorate_exams_grades: []
        },
        {
          id:                  6,
          position_in_program: 5,
          title:               "Passed course - check mark, grade is 88%",
          runs:                [
            {
              certificate_url:   "www.google.com",
              course_id:         "course-v1:edX+DemoX+Demo_Course",
              id:                5,
              status:            STATUS_PASSED,
              title:             "Demo course",
              final_grade:       "88",
              position:          0,
              course_start_date: "2016-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z"
            }
          ],
          description:             "The demo course",
          prerequisites:           "",
          proctorate_exams_grades: []
        },
        {
          id:                      7,
          position_in_program:     2,
          title:                   "Empty course - no status text",
          runs:                    [],
          description:             null,
          prerequisites:           null,
          proctorate_exams_grades: []
        },
        {
          id:                  6789,
          position_in_program: 11,
          title:               "Current verified course - grade is 88%",
          runs:                [
            {
              certificate_url:   "www.google.com",
              course_id:         "course-v1:current",
              id:                5678,
              status:            STATUS_CURRENTLY_ENROLLED,
              title:             "Current course run",
              current_grade:     "23",
              position:          0,
              course_start_date: "2016-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z"
            }
          ],
          description:             "The demo course",
          prerequisites:           "",
          proctorate_exams_grades: []
        },
        {
          id:                  8,
          position_in_program: 3,
          title:               "Not verified course - upgrade button",
          runs:                [
            {
              id:                      7,
              status:                  STATUS_CAN_UPGRADE,
              title:                   "Not verified run",
              course_id:               "not-verified",
              position:                0,
              price:                   50.0,
              course_start_date:       "2016-08-22T11:48:27Z",
              fuzzy_start_date:        "Fall 2017",
              course_end_date:         "2016-09-09T10:20:10Z",
              course_upgrade_deadline: "2016-08-20T11:48:27Z"
            }
          ],
          description:             null,
          prerequisites:           null,
          proctorate_exams_grades: []
        },
        {
          id:                  10,
          position_in_program: 4,
          title:
            "Enrollment starting course - disabled enroll button, text says Enrollment begins 3/3/2106",
          runs: [
            {
              course_id:                   "course-v1:supply+chain2",
              id:                          8,
              status:                      STATUS_OFFERED,
              fuzzy_enrollment_start_date: null,
              title:                       "Enrollment starting run",
              enrollment_start_date:       "2106-03-04T01:00:00Z",
              position:                    0,
              price:                       30.0,
              course_start_date:           "2016-08-22T11:48:27Z",
              fuzzy_start_date:            "Fall 2017",
              course_end_date:             "2016-09-09T10:20:10Z"
            }
          ],
          description:             null,
          prerequisites:           null,
          proctorate_exams_grades: []
        },
        {
          id:                  1278,
          title:               "Passed course, most recent run non-passed, older passed",
          position_in_program: 7,
          runs:                [
            {
              certificate_url:   "www.google.com",
              title:             "Passed run missing grade",
              status:            STATUS_PASSED,
              position:          2,
              course_id:         "course_id_one",
              id:                100,
              course_start_date: "2015-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2015",
              course_end_date:   "2015-09-09T10:20:10Z"
            },
            {
              certificate_url:   "www.google.com",
              title:             "Passed run missing grade",
              status:            STATUS_PASSED,
              position:          1,
              course_id:         "course_id_two",
              final_grade:       "88",
              id:                102,
              course_start_date: "2015-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2015",
              course_end_date:   "2015-09-09T10:20:10Z"
            },
            {
              certificate_url:   "www.google.com",
              title:             "Passed run missing grade",
              status:            STATUS_NOT_PASSED,
              position:          0,
              course_id:         "course_id_three",
              final_grade:       "43",
              id:                101,
              course_start_date: "2016-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z"
            }
          ],
          proctorate_exams_grades: []
        },
        {
          id:                  17,
          title:               "Passed course missing grade - check mark, no grade",
          position_in_program: 6,
          runs:                [
            {
              certificate_url:   "www.google.com",
              title:             "Passed run missing grade",
              status:            STATUS_PASSED,
              position:          0,
              course_id:         "course_id",
              id:                10,
              course_start_date: "2016-08-22T11:48:27Z",
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z"
            }
          ],
          proctorate_exams_grades: []
        },
        {
          id:                  15,
          position_in_program: 9,
          title:
            "verified not completed, course starts in future - action text is Course starting",
          runs: [
            {
              id:                13,
              status:            STATUS_WILL_ATTEND,
              course_start_date: "8765-03-21",
              title:             "First run",
              position:          0,
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z",
              course_id:         "verified"
            }
          ],
          proctorate_exams_grades: []
        },
        {
          id:                  11,
          position_in_program: 0,
          title:
            "Fuzzy enrollment starting course - First in program, action text is enrollment begins soonish",
          runs: [
            {
              course_id:                   "course-v1:supply+chain3",
              id:                          9,
              status:                      STATUS_OFFERED,
              fuzzy_enrollment_start_date: "soonish",
              title:                       "Fuzzy enrollment starting run",
              position:                    0,
              price:                       40.0,
              course_start_date:           "2016-08-22T11:48:27Z",
              fuzzy_start_date:            "Fall 2017",
              course_end_date:             "2016-09-09T10:20:10Z"
            }
          ],
          description:             null,
          prerequisites:           null,
          proctorate_exams_grades: []
        },
        {
          id:                  16,
          position_in_program: 10,
          title:               "Pending enrollment course",
          runs:                [
            {
              course_id:             "course-v1:pending",
              id:                    47,
              title:                 "Pending enrollment course run",
              position:              0,
              status:                STATUS_PENDING_ENROLLMENT,
              course_start_date:     "2018-08-22T11:48:27Z",
              course_end_date:       "2018-09-09T10:20:10Z",
              enrollment_start_date: "2016-03-04T01:00:00Z"
            }
          ],
          proctorate_exams_grades: []
        }
      ],
      title:                      "Master Program",
      description:                null,
      financial_aid_availability: false,
      id:                         4
    },
    {
      financial_aid_availability: false,
      title:                      "Missed deadline program",
      description:                "Missed deadline program",
      courses:                    [
        {
          id:                  9,
          position_in_program: 0,
          title:               "Course for the missed deadline program",
          description:         "Course for the missed deadline program",
          prerequisites:       "",
          runs:                [
            {
              course_id:         "course-v1:edX+missed+deadline",
              id:                12,
              status:            STATUS_MISSED_DEADLINE,
              title:             "Course run for the missed deadline program",
              position:          0,
              course_start_date: "2016-01-01",
              course_end_date:   "2016-09-09T10:20:10Z"
            }
          ],
          proctorate_exams_grades: []
        }
      ],
      id: 5
    },
    {
      financial_aid_availability: false,
      title:                      "Empty program",
      description:                "The empty program",
      courses:                    [],
      id:                         2
    },
    {
      title:               "Last program",
      description:         "The last program",
      pearson_exam_status: "",
      courses:             [
        {
          id:                  13,
          position_in_program: 0,
          title:
            "Course for last program in progress - no grade, action or description",
          runs: [
            {
              course_id:         "course-v1:edX+DemoX+Demo_Course2",
              id:                11,
              status:            STATUS_CURRENTLY_ENROLLED,
              title:             "Course run for last program",
              position:          0,
              course_start_date: "2016-01-01",
              fuzzy_start_date:  "Fall 2017",
              course_end_date:   "2016-09-09T10:20:10Z"
            }
          ],
          description:             "Course for Last program",
          prerequisites:           "",
          proctorate_exams_grades: []
        }
      ],
      financial_aid_availability: false,
      id:                         6
    },
    {
      title:       "Paid but not enrolled",
      description: "Paid but not enrolled",
      courses:     [
        {
          id:                  24,
          position_in_program: 1,
          title:               "Course for paid but not enrolled program",
          description:         "Course for paid but not enrolled program",
          prerequisites:       "",
          runs:                [
            {
              position:          1,
              course_id:         "course-v1:MITx+paid+not+enrolled+100+Jan_2015",
              id:                66,
              course_start_date: "2016-12-20T00:00:00Z",
              course_end_date:   "2018-05-15T00:00:00Z",
              enrollment_url:    "",
              fuzzy_start_date:  "",
              current_grade:     null,
              title:             "Digital Learning 100 - January 2015",
              status:            STATUS_PAID_BUT_NOT_ENROLLED
            }
          ],
          proctorate_exams_grades: []
        }
      ],
      financial_aid_availability: true,
      id:                         7
    }
  ]
})

export const PROGRAMS: AvailablePrograms = deepFreeze(
  DASHBOARD_RESPONSE.programs.map(program => ({
    id:              program.id,
    title:           program.title,
    programpage_url: `/program${program.id}/`,
    enrolled:        true,
    total_courses:   1
  }))
)

export const FINANCIAL_AID_PARTIAL_RESPONSE: FinancialAidUserInfo = deepFreeze({
  application_status: null,
  has_user_applied:   false,
  max_possible_cost:  1000,
  min_possible_cost:  1000
})

export const COURSE_PRICES_RESPONSE: CoursePrices = deepFreeze(
  DASHBOARD_RESPONSE.programs.map(program => ({
    program_id:                 program.id,
    price:                      Decimal(program.id * 1000),
    financial_aid_availability: false,
    has_financial_aid_request:  false
  }))
)

export const PROGRAM_LEARNERS_RESPONSE: ProgramLearners = deepFreeze({
  learners: [
    {
      username:    "Jane",
      image_small: "url"
    }
  ],
  learners_count: 50
})

export const ERROR_RESPONSE = deepFreeze({
  errorStatusCode: 500,
  error_code:      "AB123",
  user_message:    "custom error message for the user."
})

export const ATTACH_COUPON_RESPONSE = deepFreeze({
  message: "Attached user to coupon successfully.",
  coupon:  {
    amount:       Decimal("0.55"),
    amount_type:  COUPON_AMOUNT_TYPE_PERCENT_DISCOUNT,
    content_type: COUPON_CONTENT_TYPE_PROGRAM,
    coupon_code:  "success-coupon",
    object_id:    3,
    program_id:   3
  }
})

export const COUPON = deepFreeze(ATTACH_COUPON_RESPONSE.coupon)

/* eslint-disable max-len */
export const CYBERSOURCE_CHECKOUT_RESPONSE = deepFreeze({
  payload: {
    access_key:                   "access_key",
    amount:                       "123.45",
    consumer_id:                  "staff",
    currency:                     "USD",
    locale:                       "en-us",
    override_custom_cancel_page:  "https://micromasters.mit.edu?cancel",
    override_custom_receipt_page: "https://micromasters.mit.edu?receipt",
    profile_id:                   "profile_id",
    reference_number:             "MM-george.local-56",
    signature:                    "56ItDy52E+Ii5aXhiq89OwRsImukIQRQetaHVOM0Fug=",
    signed_date_time:             "2016-08-24T19:07:57Z",
    signed_field_names:
      "access_key,amount,consumer_id,currency,locale,override_custom_cancel_page,override_custom_receipt_page,profile_id,reference_number,signed_date_time,signed_field_names,transaction_type,transaction_uuid,unsigned_field_names",
    transaction_type:     "sale",
    transaction_uuid:     "uuid",
    unsigned_field_names: ""
  },
  url:    "https://testsecureacceptance.cybersource.com/pay",
  method: "POST"
})

export const EDX_CHECKOUT_RESPONSE = deepFreeze({
  payload: {},
  url:     "http://edx.org/",
  method:  "GET"
})
/* eslint-enable max-len */

const queryFilters = `{
  "bool": {
    "must":[
      { 
        "nested": {
          "path": "program.courses",
          "filter": {
            "term": {
              "program.courses.payment_status": "Paid"
            }
          }
        }
      },
      {
        "term": {
          "program.id":1
        }
      }
    ]
  }
}`

export const GET_AUTOMATIC_EMAILS_RESPONSE = [
  {
    enabled:       true,
    email_subject: "First Email",
    email_body:    "such a great email, literally so great",
    sender_name:   "Simone de Beauvoir",
    id:            1,
    query:         {
      original_query: {
        post_filter: { ...JSON.parse(queryFilters) }
      }
    }
  },
  {
    enabled:       false,
    email_subject: "Second (disabled) Email",
    email_body:    "this one was not as good :(",
    sender_name:   "Jean-Paul Sartre",
    id:            2,
    query:         {
      original_query: {
        post_filter: { ...JSON.parse(queryFilters) }
      }
    }
  }
]

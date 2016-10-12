// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use 'fetch' defined as a global instead of importing as a local.
import 'isomorphic-fetch';
import R from 'ramda';

import type { Profile, ProfileGetResult, ProfilePatchResult } from '../flow/profileTypes';
import type { CheckoutResponse } from '../flow/checkoutTypes';
import type { Dashboard } from '../flow/dashboardTypes';
import type { ProgramEnrollment, ProgramEnrollments } from '../flow/enrollmentTypes';
import type { EmailSendResponse } from '../flow/emailTypes';

export function getCookie(name: string): string|null {
  let cookieValue = null;

  if (document.cookie && document.cookie !== '') {
    let cookies = document.cookie.split(';');

    for (let cookie of cookies) {
      cookie = cookie.trim();

      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === `${name}=`) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export function csrfSafeMethod(method: string): boolean {
  // these HTTP methods do not require CSRF protection
  return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method);
}

const headers = R.merge({ headers: {} });

const method = R.merge({ method: 'GET' });

const credentials = R.merge({ credentials: 'same-origin' });

const setWith = R.curry((path, valFunc, obj) => (
  R.set(path, valFunc(), obj)
));

const csrfToken = R.unless(
  R.compose(csrfSafeMethod, R.prop('method')),
  setWith(
    R.lensPath(['headers', 'X-CSRFToken']),
    () => getCookie('csrftoken')
  )
);

const jsonHeaders = R.merge({ headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}});

const formatRequest = R.compose(
  csrfToken, credentials, method, headers
);

const formatJSONRequest = R.compose(formatRequest, jsonHeaders);

export function fetchWithCSRF(path: string, init: Object = {}): Promise<*> {
  return fetch(path, formatRequest(init)).then(response => {
    let text = response.text();

    if (response.status < 200 || response.status >= 300) {
      return text.then(text => {
        return Promise.reject([text, response.status]);
      });
    }

    return text;
  });
}

/**
 * Calls to fetch but does a few other things:
 *  - turn cookies on for this domain
 *  - set headers to handle JSON properly
 *  - handle CSRF
 *  - non 2xx status codes will reject the promise returned
 *  - response JSON is returned in place of response
 */
export function fetchJSONWithCSRF(input: string, init: Object = {}, loginOnError: boolean = false): Promise<*> {
  return fetch(input, formatJSONRequest(init)).then(response => {
    // Not using response.json() here since it doesn't handle empty responses
    // Also note that text is a promise here, not a string
    let text = response.text();

    // For 400 and 401 errors, force login
    // the 400 error comes from edX in case there are problems with the refresh
    // token because the data stored locally is wrong and the solution is only
    // to force a new login
    if (loginOnError === true && (response.status === 400 || response.status === 401)) {
      window.location = '/login/edxorg/';
    }

    // For non 2xx status codes reject the promise adding the status code
    if (response.status < 200 || response.status >= 300) {
      return text.then(text => {
        return Promise.reject([text, response.status]);
      });
    }

    return text;
  }).then(text => {
    if (text.length !== 0) {
      return JSON.parse(text);
    } else {
      return "";
    }
  }).catch(([text, statusCode]) => {
    let respJson = {};
    if (text.length !== 0) {
      try {
        respJson = JSON.parse(text);
      }
      catch(e) {
        // If the JSON.parse raises, it means that the backend sent a JSON invalid
        // string, and in this context the content received is not important
        // and can be discarded
      }
    }
    respJson.errorStatusCode = statusCode;
    return Promise.reject(respJson);
  });
}

// import to allow mocking in tests
import {
  fetchJSONWithCSRF as mockableFetchJSONWithCSRF,
  fetchWithCSRF as mockableFetchWithCSRF
} from './api';
export function getUserProfile(username: string): Promise<ProfileGetResult> {
  return mockableFetchJSONWithCSRF(`/api/v0/profiles/${username}/`);
}

export function patchUserProfile(username: string, profile: Profile): Promise<ProfilePatchResult> {
  delete profile['image'];
  return mockableFetchJSONWithCSRF(`/api/v0/profiles/${username}/`, {
    method: 'PATCH',
    body: JSON.stringify(profile)
  });
}

export function getDashboard(): Promise<Dashboard> {
  return mockableFetchJSONWithCSRF('/api/v0/dashboard/', {}, true);
}

export function checkout(courseId: string): Promise<CheckoutResponse> {
  return mockableFetchJSONWithCSRF('/api/v0/checkout/', {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId
    })
  });
}

export function sendSearchResultMail(subject: string, body: string, searchRequest: Object): Promise<EmailSendResponse> {
  return mockableFetchJSONWithCSRF('/api/v0/mail/', {
    method: 'POST',
    body: JSON.stringify({
      email_subject: subject,
      email_body: body,
      search_request: searchRequest
    })
  });
}

export function getProgramEnrollments(): Promise<ProgramEnrollments> {
  return mockableFetchJSONWithCSRF('/api/v0/enrolledprograms/', {}, true);
}

export function addProgramEnrollment(programId: number): Promise<ProgramEnrollment> {
  return mockableFetchJSONWithCSRF('/api/v0/enrolledprograms/', {
    method: 'POST',
    body: JSON.stringify({
      program_id: programId
    })
  });
}

export function updateProfileImage(username: string, image: Blob, name: string): Promise<string> {
  let formData = new FormData();
  formData.append('image', image, name);
  return mockableFetchWithCSRF(`/api/v0/profiles/${username}/`, {
    headers: {
      'Accept': 'text/html',
    },
    method: 'PATCH',
    body: formData
  });
}

export function addFinancialAid(income: number, currency: string, programId: number): Promise<*> {
  return mockableFetchJSONWithCSRF('/api/v0/financial_aid_request/', {
    method: 'POST',
    body: JSON.stringify({
      original_income: income,
      original_currency: currency,
      program_id: programId
    })
  });
}

export function getCoursePrices(): Promise<*> {
  return mockableFetchJSONWithCSRF('/api/v0/course_prices/', {});
}

export function skipFinancialAid(programId: number): Promise<*> {
  return mockableFetchJSONWithCSRF(`/api/v0/financial_aid_skip/${programId}/`, {
    method: 'PATCH',
  });
}
export function updateDocumentSentDate(financialAidId: number, sentDate: string): Promise<*> {
  return mockableFetchJSONWithCSRF(`/api/v0/financial_aid/${financialAidId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      date_documents_sent: sentDate,
    })
  });
}

export function addCourseEnrollment(courseId: string) {
  return mockableFetchJSONWithCSRF('/api/v0/course_enrollments/', {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId,
    })
  });
}

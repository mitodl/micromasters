// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use 'fetch' defined as a global instead of importing as a local.
import R from 'ramda';
import Decimal from 'decimal.js-light';

import type { Profile, ProfileGetResult, ProfilePatchResult } from '../flow/profileTypes';
import type { CheckoutResponse } from '../flow/checkoutTypes';
import type { Coupons, AttachCouponResponse } from '../flow/couponTypes';
import type { Dashboard, CoursePrices, ProgramLearners } from '../flow/dashboardTypes';
import type { AvailableProgram, AvailablePrograms } from '../flow/enrollmentTypes';
import type { EmailSendResponse } from '../flow/emailTypes';
import type { PearsonSSOParameters } from '../flow/pearsonTypes';
import { fetchWithCSRF, fetchJSONWithCSRF } from 'redux-hammock/django_csrf_fetch';

const loginOnEdXError = (response: Response) => {
  if (response.errorStatusCode === 400 || response.errorStatusCode === 401) {
    const relativePath = window.location.pathname + window.location.search;
    const loginRedirect = `/login/edxorg/?next=${encodeURIComponent(relativePath)}`;
    window.location = `/logout?next=${encodeURIComponent(loginRedirect)}`;
  }
};

export function getUserProfile(username: string): Promise<ProfileGetResult> {
  return fetchJSONWithCSRF(`/api/v0/profiles/${username}/`);
}

export function patchUserProfile(username: string, profile: Profile): Promise<ProfilePatchResult> {
  profile = {
    ...profile,
    image: undefined,
  };
  return fetchJSONWithCSRF(`/api/v0/profiles/${username}/`, {
    method: 'PATCH',
    body: JSON.stringify(profile)
  });
}

export async function getDashboard(username: string): Promise<Dashboard> {
  try {
    let response = await fetchJSONWithCSRF(`/api/v0/dashboard/${username}/`);
    return response;
  } catch (response) {
    loginOnEdXError(response);
    return response;
  }
}

export function checkout(courseId: string): Promise<CheckoutResponse> {
  return fetchJSONWithCSRF('/api/v0/checkout/', {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId
    })
  });
}

export function sendSearchResultMail(
  subject: string, body: string, searchRequest: Object, sendAutomaticEmails: boolean,
): Promise<EmailSendResponse> {
  return fetchJSONWithCSRF('/api/v0/mail/search/', {
    method: 'POST',
    body: JSON.stringify({
      email_subject: subject,
      email_body: body,
      search_request: searchRequest,
      send_automatic_emails: sendAutomaticEmails,
    })
  });
}

export function sendCourseTeamMail(subject: string, body: string, courseId: number): Promise<EmailSendResponse> {
  return fetchJSONWithCSRF(`/api/v0/mail/course/${courseId}/`, {
    method: 'POST',
    body: JSON.stringify({
      email_subject: subject,
      email_body: body
    })
  });
}

export function sendLearnerMail(subject: string, body: string, studentId: number): Promise<EmailSendResponse> {
  return fetchJSONWithCSRF(`/api/v0/mail/learner/${studentId}/`, {
    method: 'POST',
    body: JSON.stringify({
      email_subject: subject,
      email_body: body
    })
  });
}

export async function getPrograms(): Promise<AvailablePrograms> {
  try {
    let response = await fetchJSONWithCSRF('/api/v0/programs/');
    return response;
  } catch (response) {
    loginOnEdXError(response);
    return response;
  }
}

export function getProgramLearners(programId: number): Promise<ProgramLearners> {
  return fetchJSONWithCSRF(`/api/v0/programlearners/${programId}/`);
}

export function addProgramEnrollment(programId: number): Promise<AvailableProgram> {
  return fetchJSONWithCSRF('/api/v0/enrolledprograms/', {
    method: 'POST',
    body: JSON.stringify({
      program_id: programId
    })
  });
}

export function updateProfileImage(username: string, image: Blob, name: string): Promise<string> {
  let formData = new FormData();
  formData.append('image', image, name);
  return fetchWithCSRF(`/api/v0/profiles/${username}/`, {
    headers: {
      'Accept': 'text/html',
    },
    method: 'PATCH',
    body: formData
  });
}

// this hits our endpoint to get the sso_digest, session_timout, etc
export function getPearsonSSO(): Promise<PearsonSSOParameters> {
  return fetchJSONWithCSRF('/api/v0/pearson/sso/');
}

export function addFinancialAid(income: number, currency: string, programId: number): Promise<*> {
  return fetchJSONWithCSRF('/api/v0/financial_aid_request/', {
    method: 'POST',
    body: JSON.stringify({
      original_income: income,
      original_currency: currency,
      program_id: programId
    })
  });
}

export function getCoursePrices(username: string): Promise<CoursePrices> {
  return fetchJSONWithCSRF(`/api/v0/course_prices/${username}/`).then(coursePrices => {
    // turn `price` from string into decimal
    return R.map(R.evolve({price: Decimal}), coursePrices);
  });
}

export function skipFinancialAid(programId: number): Promise<*> {
  return fetchJSONWithCSRF(`/api/v0/financial_aid_skip/${programId}/`, {
    method: 'PATCH',
  });
}
export function updateDocumentSentDate(financialAidId: number, sentDate: string): Promise<*> {
  return fetchJSONWithCSRF(`/api/v0/financial_aid/${financialAidId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      date_documents_sent: sentDate,
    })
  });
}

export function addCourseEnrollment(courseId: string) {
  return fetchJSONWithCSRF('/api/v0/course_enrollments/', {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId,
    })
  });
}

export function getCoupons(): Promise<Coupons> {
  return fetchJSONWithCSRF('/api/v0/coupons/').then(coupons => {
    // turn `amount` from string into decimal
    return R.map(R.evolve({amount: Decimal}), coupons);
  });
}

export function attachCoupon(couponCode: string): Promise<AttachCouponResponse> {
  let code = encodeURI(couponCode);
  return fetchJSONWithCSRF(`/api/v0/coupons/${code}/users/`, {
    method: 'POST',
    body: JSON.stringify({
      username: SETTINGS.user.username
    })
  }).then(response => (
    R.evolve({coupon: {amount: Decimal}}, response)
  ));
}

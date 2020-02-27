"""
Tests for financial aid views
"""
# pylint: disable=redefined-outer-name
import json
from types import SimpleNamespace
from urllib.parse import urlencode
import pytest
from django.urls import reverse
import factory
from rest_framework import status

from micromasters.utils import now_in_utc
from financialaid.api_test import (
    create_program,
    create_enrolled_profile,
)
from financialaid.factories import FinancialAidFactory
from financialaid.constants import FinancialAidStatus
from financialaid.views import ReviewFinancialAidView
from profiles.factories import ProfileFactory
from roles.roles import Staff, Instructor


pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.django_db,
]


@pytest.fixture()
def program_data():
    """
    Fixture for program and tier_program test data
    """
    program, tier_programs = create_program()
    return SimpleNamespace(
        program=program,
        tier_programs=tier_programs,
    )


@pytest.fixture()
def staff_client(client, program_data):
    """
    Fixture for a Django client that has a logged-in staff user
    """
    staff_user_profile = create_enrolled_profile(program_data.program, role=Staff.ROLE_ID)
    client.force_login(staff_user_profile.user)
    return client


class TestReviewViews():
    """
    Tests for ReviewFinancialAidView
    """
    @staticmethod
    def review_url(program_id, status=None, sort_param=None, search_param=None):
        """Returns a proper url that is handled by the ReviewFinancialAidView"""
        url_kwargs = {"program_id": program_id}
        if status:
            url_kwargs["status"] = status
        url = reverse("review_financial_aid", kwargs=url_kwargs)
        qs_dict = {}
        if sort_param:
            qs_dict.update(dict(sort_by=sort_param))
        if search_param:
            qs_dict.update(dict(search_query=search_param))
        if qs_dict:
            url = '{}?{}'.format(url, urlencode(qs_dict))
        return url

    @pytest.fixture()
    def program_review_url(self, program_data):
        """Returns the base FA review url for the test program """
        return self.review_url(program_data.program.id)

    def test_allowed_for_staff(self, staff_client, program_review_url):
        """
        Allowed for staff users
        """
        assert staff_client.get(program_review_url).status_code == status.HTTP_200_OK

    @pytest.mark.parametrize("role", [Instructor.ROLE_ID, None])
    def test_not_staff(self, client, program_data, program_review_url, role):
        """
        Test that the view is restricted for non-staff users
        """
        client.force_login(create_enrolled_profile(program_data.program, role=role).user)
        assert client.get(program_review_url).status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous(self, client, program_review_url):
        """
        Not allowed for not logged in users
        """
        client.logout()
        assert client.get(program_review_url).status_code == status.HTTP_403_FORBIDDEN

    def test_staff_of_different_program(self, client, program_review_url):
        """
        Not allowed for staff of different program
        """
        new_program, _ = create_program()
        new_staff_user = create_enrolled_profile(new_program, role=Staff.ROLE_ID).user
        client.force_login(new_staff_user)
        assert client.get(program_review_url).status_code == status.HTTP_403_FORBIDDEN

    def test_unavailable_financial_aid(self, staff_client, program_data, program_review_url):
        """
        Not allowed if program doesn't have financial aid
        """
        program_data.program.financial_aid_availability = False
        program_data.program.save()
        assert staff_client.get(program_review_url).status_code == status.HTTP_404_NOT_FOUND

    def test_not_live(self, staff_client, program_data, program_review_url):
        """
        Not allowed if program is not live
        """
        program_data.program.live = False
        program_data.program.save()
        assert staff_client.get(program_review_url).status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.parametrize("fin_aid_status, sort_param", [
        (FinancialAidStatus.AUTO_APPROVED, None),
        (None, '-last_name'),
        (FinancialAidStatus.AUTO_APPROVED, '-last_name'),
    ])
    def test_filter_and_sorting(self, staff_client, program_data, fin_aid_status, sort_param):
        """
        Tests ReviewFinancialAidView correctly applies sort and filter parameters, or
        uses defaults for those parameters
        """
        FinancialAidFactory.create_batch(
            10,
            tier_program=program_data.tier_programs["0k"],
            status=factory.Iterator([
                ReviewFinancialAidView.default_status,
                FinancialAidStatus.AUTO_APPROVED
            ])
        )
        url = self.review_url(program_data.program.id, status=fin_aid_status, sort_param=sort_param)
        resp = staff_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        financial_aid_objects = resp.context_data["financial_aid_objects"]

        # View should filter FinancialAid objects by the provided status or a default status
        expected_status = fin_aid_status or ReviewFinancialAidView.default_status
        assert all(fin_aid.status == expected_status for fin_aid in financial_aid_objects)
        # View should sort by the given parameter, or sort by ascending last name by default
        should_reverse_sort = sort_param == '-last_name'
        assert (
            list(financial_aid_objects) ==
            sorted(financial_aid_objects, key=lambda f: f.user.last_name, reverse=should_reverse_sort)
        )

    @pytest.mark.parametrize("fin_aid_status, sort_param", [
        ('asdfghjkl', None),
        (None, 'asdfghjkl'),
        ('asdfghjkl', 'asdfghjkl'),
    ])
    def test_invalid_sorting_and_filter(self, staff_client, program_data, fin_aid_status, sort_param):
        """
        Shouldn't break with invalid sorting or filter parameters
        """
        FinancialAidFactory.create(tier_program=program_data.tier_programs["0k"])
        url = self.review_url(program_data.program.id, status=fin_aid_status, sort_param=sort_param)
        resp = staff_client.get(url)
        assert resp.status_code == status.HTTP_200_OK

    def test_view_with_search(self, staff_client, program_data):
        """
        Tests that ReviewFinancialAidView returns the expected results with search
        """
        fin_aid_status = FinancialAidStatus.AUTO_APPROVED
        profiles = ProfileFactory.create_batch(
            4,
            first_name=factory.Iterator(['match_name', 'x', 'y', 'z']),
            last_name=factory.Iterator(['x', 'y', 'z', 'match_name']),
        )
        FinancialAidFactory.create_batch(
            4,
            tier_program=program_data.tier_programs["0k"],
            status=fin_aid_status,
            user=factory.Iterator([p.user for p in profiles])
        )
        name_query = 'match_name'
        url = self.review_url(program_data.program.id, status=fin_aid_status, search_param=name_query)
        resp = staff_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        financial_aid_objects = resp.context_data["financial_aid_objects"]

        # Two users should match the search term - one for first_name, one for last_name
        assert len(financial_aid_objects) == 2
        assert all(
            name_query in (fin_aid.user.profile.first_name, fin_aid.user.profile.last_name)
            for fin_aid in financial_aid_objects
        )

    def test_context(self, settings, staff_client, program_review_url):
        """
        Test context information for financial aid review page
        """
        settings.GA_TRACKING_ID = 'track'
        settings.REACT_GA_DEBUG = True
        settings.EDXORG_BASE_URL = 'edx_base_url'
        resp = staff_client.get(program_review_url)

        assert resp.context['has_zendesk_widget'] is True
        assert resp.context['is_public'] is False
        assert resp.context['is_staff'] is True
        assert json.loads(resp.context['js_settings_json']) == {
            'gaTrackingID': settings.GA_TRACKING_ID,
            'reactGaDebug': settings.REACT_GA_DEBUG,
            'authenticated': True,
            'edx_base_url': settings.EDXORG_BASE_URL,
        }


class TestFinancialAidDetailViews():
    """
    Tests for FinancialAidDetailView
    """
    @pytest.fixture()
    def test_props(self, program_data):
        """
        Fixture that provides test properties for FinancialAidDetailView test cases
        """
        user = create_enrolled_profile(program_data.program).user
        pending_fa = FinancialAidFactory.create(
            user=user,
            tier_program=program_data.tier_programs["25k"],
            status=FinancialAidStatus.PENDING_DOCS
        )
        docs_sent_url = reverse(
            "financial_aid",
            kwargs={"financial_aid_id": pending_fa.id}
        )
        docs_sent_date = now_in_utc().date()
        docs_sent_request_params = dict(
            content_type="application/json",
            data=json.dumps({
                "date_documents_sent": docs_sent_date.strftime("%Y-%m-%d")
            })
        )
        return SimpleNamespace(
            user=user,
            pending_fa=pending_fa,
            docs_sent_url=docs_sent_url,
            docs_sent_request_params=docs_sent_request_params,
            docs_sent_date=docs_sent_date,
        )

    @pytest.fixture()
    def logged_in_client(self, client, test_props):
        """
        Fixture for a Django client that is logged in for the test user
        """
        client.force_login(test_props.user)
        return client

    def test_learner_can_indicate_documents_sent(self, logged_in_client, test_props):
        """
        Tests FinancialAidDetailView for user editing their own financial aid document status
        """
        resp = logged_in_client.patch(test_props.docs_sent_url, **test_props.docs_sent_request_params)
        assert resp.status_code == status.HTTP_200_OK
        test_props.pending_fa.refresh_from_db()
        assert test_props.pending_fa.status == FinancialAidStatus.DOCS_SENT
        assert test_props.pending_fa.date_documents_sent == test_props.docs_sent_date

    @pytest.mark.parametrize("role", [Staff.ROLE_ID, Instructor.ROLE_ID, None])
    def test_inadequate_permissions(self, client, program_data, test_props, role):
        """
        Tests FinancialAidDetailView for user without permission to edit document status
        """
        unpermitted_user = create_enrolled_profile(program_data.program, role=role).user
        client.force_login(unpermitted_user)
        resp = client.patch(test_props.docs_sent_url, **test_props.docs_sent_request_params)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous(self, client, test_props):
        """
        Anonymous users can't update status for docs sent
        """
        client.logout()
        resp = client.patch(test_props.docs_sent_url, **test_props.docs_sent_request_params)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.parametrize("financial_aid_status", filter(
        lambda fa_status: fa_status != FinancialAidStatus.PENDING_DOCS,
        FinancialAidStatus.ALL_STATUSES
    ))
    def test_only_change_pending_status(self, logged_in_client, test_props, financial_aid_status):
        """
        Tests that the view can only change the status of a FinancialAid record that has a 'pending' status
        """
        test_props.pending_fa.status = financial_aid_status
        test_props.pending_fa.save()
        resp = logged_in_client.patch(test_props.docs_sent_url, **test_props.docs_sent_request_params)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

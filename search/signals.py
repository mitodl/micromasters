"""
Signals used for indexing
"""

import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from profiles.models import (
    Education,
    Employment,
    Profile,
)
from search.models import PercolateQuery
from search.tasks import (
    index_users,
    remove_user,
    index_percolate_queries,
    delete_percolate_query,
)
from roles.models import Role

log = logging.getLogger(__name__)

# all the following signal handlers do basically the same.
# The reason why there is one function per sender is
# because each signal handler needs to be hooked to a single sender
# otherwise it would run for any `post_save`/`post_delete` coming from any model


# pylint: disable=unused-argument
@receiver(post_save, sender=Profile, dispatch_uid="profile_post_save_index")
def handle_update_profile(sender, instance, **kwargs):
    """Update index when Profile model is updated."""
    index_users.delay([instance.user])


@receiver(post_save, sender=Education, dispatch_uid="education_post_save_index")
def handle_update_education(sender, instance, **kwargs):
    """Update index when Education model is updated."""
    index_users.delay([instance.profile.user])


@receiver(post_save, sender=Employment, dispatch_uid="employment_post_save_index")
def handle_update_employment(sender, instance, **kwargs):
    """Update index when Employment model is updated."""
    index_users.delay([instance.profile.user])


@receiver(post_delete, sender=Profile, dispatch_uid="profile_post_delete_index")
def handle_delete_profile(sender, instance, **kwargs):
    """Update index when Profile model instance is deleted."""
    remove_user.delay(instance.user)


@receiver(post_delete, sender=Education, dispatch_uid="education_post_delete_index")
def handle_delete_education(sender, instance, **kwargs):
    """Update index when Education model instance is deleted."""
    index_users.delay([instance.profile.user])


@receiver(post_delete, sender=Employment, dispatch_uid="employment_post_delete_index")
def handle_delete_employment(sender, instance, **kwargs):
    """Update index when Employment model instance is deleted."""
    index_users.delay([instance.profile.user])


@receiver(post_save, sender=PercolateQuery, dispatch_uid="percolate_query_save")
def handle_update_percolate(sender, instance, **kwargs):
    """When a new query is created or a query is updated, update Elasticsearch too"""
    transaction.on_commit(lambda: index_percolate_queries.delay([instance.id]))


@receiver(post_delete, sender=PercolateQuery, dispatch_uid="percolate_query_delete")
def handle_delete_percolate(sender, instance, **kwargs):
    """When a query is deleted, make sure we also delete it on Elasticsearch"""
    transaction.on_commit(lambda: delete_percolate_query.delay(instance.id))


@receiver(post_save, sender=Role, dispatch_uid="role_post_create_index")
def handle_create_role(sender, instance, **kwargs):
    """Update index when Role model instance is created."""
    index_users.delay([instance.user])


@receiver(post_delete, sender=Role, dispatch_uid="role_post_remove_index")
def handle_remove_role(sender, instance, **kwargs):
    """Update index when Role model instance is deleted."""
    index_users.delay([instance.user])

"""
Classes related to models for MicroMasters
"""

from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.db import transaction
from django.db.models import (
    DateTimeField,
    ForeignKey,
    Manager,
    Model,
    SET_NULL,
)
from django.db.models.query import QuerySet

from micromasters.utils import now_in_utc


class TimestampedModelQuerySet(QuerySet):
    """
    Subclassed QuerySet for TimestampedModelManager
    """
    def update(self, **kwargs):
        """
        Automatically update updated_on timestamp when .update(). This is because .update()
        does not go through .save(), thus will not auto_now, because it happens on the
        database level without loading objects into memory.
        """
        if "updated_on" not in kwargs:
            kwargs["updated_on"] = now_in_utc()
        return super().update(**kwargs)


class TimestampedModelManager(Manager):
    """
    Subclassed manager for TimestampedModel
    """
    def update(self, **kwargs):
        """
        Allows access to TimestampedModelQuerySet's update method on the manager
        """
        return self.get_queryset().update(**kwargs)

    def get_queryset(self):
        """
        Returns custom queryset
        """
        return TimestampedModelQuerySet(self.model, using=self._db)


class TimestampedModel(Model):
    """
    Base model for create/update timestamps
    """
    objects = TimestampedModelManager()
    created_on = DateTimeField(auto_now_add=True)  # UTC
    updated_on = DateTimeField(auto_now=True)  # UTC

    class Meta:
        abstract = True


class AuditModel(TimestampedModel):
    """An abstract base class for audit models"""

    acting_user = ForeignKey(User, null=True, on_delete=SET_NULL)
    data_before = JSONField(blank=True, null=True)
    data_after = JSONField(blank=True, null=True)

    class Meta:
        abstract = True

    @classmethod
    def get_related_field_name(cls):
        """
        Returns:
            str: A field name which links the Auditable model to this model
        """
        raise NotImplementedError


class AuditableModel(Model):
    """An abstract base class for auditable models"""

    class Meta:
        abstract = True

    def to_dict(self):
        """
        Returns:
            dict:
                A serialized representation of the model object
        """
        raise NotImplementedError

    @classmethod
    def get_audit_class(cls):
        """
        Returns:
            class of Model:
                A class of a Django model used as the audit table
        """
        raise NotImplementedError

    @transaction.atomic
    def save_and_log(self, acting_user, *args, **kwargs):
        """
        Saves the object and creates an audit object.

        Args:
            acting_user (django.contrib.auth.models.User):
                The user who made the change to the model. May be None if inapplicable.
        """
        before_obj = self.__class__.objects.filter(id=self.id).first()
        self.save(*args, **kwargs)
        self.refresh_from_db()
        before_dict = None
        if before_obj is not None:
            before_dict = before_obj.to_dict()

        audit_kwargs = dict(
            acting_user=acting_user,
            data_before=before_dict,
            data_after=self.to_dict(),
        )
        audit_class = self.get_audit_class()
        audit_kwargs[audit_class.get_related_field_name()] = self
        audit_class.objects.create(**audit_kwargs)

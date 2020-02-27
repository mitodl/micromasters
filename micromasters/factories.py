"""
Factory for Users
"""
from django.contrib.auth.models import User
from factory import (
    Sequence,
    SubFactory,
    LazyAttribute,
)
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyText
from social_django.models import UserSocialAuth
from backends.edxorg import EdxOrgOAuth2
from micromasters.utils import pop_matching_keys_from_dict


def extract_related_model_kwargs(orig_kwargs, related_model_prop_name):
    """
    Extracts a set of factory kwargs that refer to a related model, removes the model prefix from the keys,
    and returns the dictionary.
    Ex. usage:
        user_factory_kwargs = dict(username='user_0', social_auth__provider='edx', social_auth__uid='user_0')
        extract_related_model_kwargs(user_factory_kwargs, 'social_auth')
        #> dict(provider='edx', uid='user_0')

    Args:
        orig_kwargs (dict): A dict of kwargs being passed to a factory generation method
        related_model_prop_name (str): The model name as it should appear in kwargs (e.g.: 'user', 'social_auth')

    Returns:
        dict: A dict of kwargs related to a specific model (without the model prefix)
    """
    related_model_prefix = '{}__'.format(related_model_prop_name)
    extracted_kwargs = pop_matching_keys_from_dict(
        orig_kwargs,
        lambda key: key.startswith(related_model_prefix)
    )
    return {k.replace(related_model_prefix, '', 1): v for k, v in extracted_kwargs.items()}


class UserFactory(DjangoModelFactory):
    """Factory for Users"""
    username = Sequence(lambda n: "user_%d" % n)
    email = FuzzyText(suffix='@example.com')

    class Meta:
        model = User


class UserSocialAuthFactory(DjangoModelFactory):
    """Factory for UserSocialAuth"""
    user = SubFactory(UserFactory)
    provider = EdxOrgOAuth2.name
    extra_data = {"access_token": "fooooootoken"}
    uid = LazyAttribute(lambda social_auth: '{}_edx'.format(social_auth.user.username))

    class Meta:
        model = UserSocialAuth


class SocialUserFactory(UserFactory):
    """Factory for Users which should also have a social_auth object created for them"""
    @classmethod
    def create(cls, *args, **kwargs):  # pylint: disable=arguments-differ
        """
        Overrides the default .create() method so that a UserSocialAuth records can be created
        """
        social_kwargs = extract_related_model_kwargs(kwargs, 'social_auth')
        created_obj = super().create(*args, **kwargs)
        UserSocialAuthFactory.create(user=created_obj, **social_kwargs)
        return created_obj

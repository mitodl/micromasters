"""Factories for pearson module"""
import faker
import pytz
import factory
from factory import fuzzy

from exams.pearson.readers import EXAMResult


FAKE = faker.Factory.create()


class EXAMResultFactory(factory.Factory):
    """Factory for EXAMResult"""
    registration_id = factory.Faker('random_int')
    client_candidate_id = factory.Faker('random_int')
    tc_id = factory.Faker('random_int')
    exam_series_code = factory.Faker('numerify', text="##.##x")
    exam_name = factory.Faker('lexify', text="MicroMasters in ????")
    exam_revision = ''  # always an empty string
    form = factory.LazyFunction(
        lambda: '{}{}'.format(FAKE.year(), FAKE.random_letter().upper())  # pylint: disable=no-member
    )
    exam_language = factory.Faker('language_code')
    attempt = factory.Faker('random_digit')
    exam_date = factory.Faker('date_time_this_year', tzinfo=pytz.utc)
    time_used = factory.Faker('time')
    passing_score = 60.0  # fixed passing score
    score = factory.LazyAttribute(lambda result: float(result.correct))
    grade = fuzzy.FuzzyChoice(choices=['pass', 'fail'])
    no_show = factory.Faker('boolean')
    nda_refused = factory.Faker('boolean')
    incorrect = factory.LazyAttribute(lambda result: 100 - result.correct)
    skipped = factory.Faker('random_int')
    unscored = factory.Faker('random_int')
    client_authorization_id = factory.Faker('random_int')
    voucher = factory.Faker('word')

    @factory.lazy_attribute
    def correct(self):
        """Number of correct answers based on pass/fail"""
        passing_score = int(self.passing_score)
        if self.grade == 'pass':
            return FAKE.random_int(min=passing_score, max=100)  # pylint: disable=no-member
        else:
            return FAKE.random_int(min=0, max=passing_score - 1)  # pylint: disable=no-member

    class Meta:  # pylint: disable=missing-docstring
        model = EXAMResult

    class Params:  # pylint: disable=missing-docstring
        passed = factory.Trait(
            grade='pass',
            no_show=False,
        )
        failed = factory.Trait(
            grade='fail',
            no_show=False,
        )
        noshow = factory.Trait(
            no_show=True,
            attempt=None,
            passing_score=None,
            score=None,
            nda_refused=None,
            correct=None,
            incorrect=None,
            skipped=None,
            unscored=None,
        )

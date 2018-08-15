"""
Freezes final grades for a course
"""
import csv
import argparse
from collections import namedtuple
from django.core.management import BaseCommand, CommandError

from grades.models import ProctoredExamGrade


class ParsingError(CommandError):
    """Custom class for parsing exceptions"""
    pass


class GradeRowParser:
    """Parser for rows of grade adjustment information in a CSV"""
    RowProps = namedtuple('RowProps', ['exam_grade_id', 'score'])
    default_col_names = dict(
        exam_grade_id='proctoredexam_id',
        score='score',
    )

    def __init__(self, col_names=None):
        """
        Args:
            col_names (dict): Mapping of RowProps property name to the name of the column in the CSV
        """
        col_names = col_names or {}
        self.col_names = self.RowProps(**{**self.default_col_names, **col_names})

    def parse_and_validate_row(self, row):
        """Parses a row of grade adjustment info and makes sure it doesn't contain bad data"""
        try:
            parsed_row = self.RowProps(
                exam_grade_id=int(row[self.col_names.exam_grade_id]),
                score=float(row[self.col_names.score]),
            )
        except KeyError as e:
            raise ParsingError('Row is missing a required column: {}'.format(str(e)))
        except ValueError as e:
            raise ParsingError('Row has an invalid value: {}'.format(str(e)))

        if parsed_row.score < 0.0 or parsed_row.score > 100.0:
            row_identifier = '{}: {}'.format(self.col_names.exam_grade_id, parsed_row.exam_grade_id)
            raise ParsingError('[{}] "score" value must be between 0 and 100'.format(row_identifier))
        return parsed_row

    def parse_exam_grade_adjustments(self, csv_reader):
        """
        Parses all rows of grade adjustment info from a CSV and yields each ProctoredExamGrade object
        with its associated grade adjustment row from the CSV

        Args:
            csv_reader (csv.DictReader): A DictReader instance

        Returns:
            tuple(ProctoredExamGrade, RowProps):
                A tuple containing a ProctoredExamGrade and its associated parsed CSV row
        """
        parsed_row_dict = {}
        for row in csv_reader:
            parsed_row = self.parse_and_validate_row(row)
            parsed_row_dict[parsed_row.exam_grade_id] = parsed_row
        exam_grade_query = ProctoredExamGrade.objects.filter(id__in=parsed_row_dict.keys())
        if exam_grade_query.count() < len(parsed_row_dict):
            bad_exam_grade_ids = set(parsed_row_dict.keys()) - set(exam_grade_query.values_list('id', flat=True))
            raise ParsingError(
                'Some exam grade IDs do not match any ProctoredExamGrade records: {}'.format(bad_exam_grade_ids)
            )
        for exam_grade in exam_grade_query.all():
            yield exam_grade, parsed_row_dict[exam_grade.id]


class Command(BaseCommand):
    """Parses a csv with exam grade adjustment information and changes the appropriate grades"""
    help = "Parses a csv with exam grade adjustment information and changes the appropriate grades"

    def add_arguments(self, parser):
        parser.add_argument('csvfile', type=argparse.FileType('r'), help='')
        parser.add_argument(
            '--grade-id-col-name',
            default=GradeRowParser.default_col_names['exam_grade_id'],
            help='Name of the column that contains the proctored exam grade id')
        parser.add_argument(
            '--score-col-name',
            default=GradeRowParser.default_col_names['score'],
            help='Name of the column that contains the score value'
        )

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument,too-many-locals
        col_names = dict(
            exam_grade_id=kwargs.get('grade_id_col_name'),
            score=kwargs.get('score_col_name'),
        )
        csvfile = kwargs.get('csvfile')
        reader = csv.DictReader(csvfile.read().splitlines(), delimiter='\t')
        grade_row_parser = GradeRowParser(col_names=col_names)

        total_rows = 0
        grades_changed = 0
        grades_unchanged = 0

        for exam_grade, parsed_adjustment_row in grade_row_parser.parse_exam_grade_adjustments(reader):
            if exam_grade.score != parsed_adjustment_row.score:
                exam_grade.set_score(parsed_adjustment_row.score)
                exam_grade.save_and_log(None)
                grades_changed = grades_changed + 1
            else:
                grades_unchanged = grades_unchanged + 1
            total_rows = total_rows + 1

        result_messages = ['Total rows: {}'.format(total_rows)]
        if grades_changed:
            result_messages.append('Grades changed: {}'.format(grades_changed))
        if grades_unchanged:
            result_messages.append('Grades found with no change in score: {}'.format(grades_unchanged))
        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))  # pylint: disable=no-member

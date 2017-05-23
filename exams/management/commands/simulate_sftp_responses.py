"""Command to simulate Pearson responses"""
import csv
import io
import os
import random
import time
import zipfile

from django.conf import settings
from django.core.management.base import BaseCommand

from exams.pearson.constants import (
    PEARSON_DATETIME_FORMAT,
    PEARSON_FILE_TYPES,
)
from exams.pearson import sftp
from micromasters.utils import now_in_utc


class Command(BaseCommand):
    """Simulates Pearson responses"""
    help = 'Simulates the SFTP backend by generating random responses'

    def add_arguments(self, parser):  # pylint: disable=no-self-use
        """Configure command args"""
        parser.add_argument(
            '--ratio-success',
            dest='ratio',
            type=float,
            default=0.5,
        )
        parser.add_argument(
            '--interval',
            dest='interval',
            type=int,
            default=5,
        )
        parser.add_argument(
            '--poll',
            action='store_true',
            dest='poll',
            default=False,
        )
        parser.add_argument(
            '--keep-files',
            action='store_true',
            dest='keep',
            default=False,
        )

    def handle(self, *args, **options):
        """Handle the command"""
        ratio = options['ratio']
        poll = options['poll']
        interval = options['interval']
        keep = options['keep']

        if poll:
            while True:
                self.handle_poll(ratio, keep)

                self.stdout.write('Next poll in {} seconds'.format(interval))
                time.sleep(interval)
        else:
            self.handle_poll(ratio, keep)

    def handle_poll(self, ratio, keep):
        """Handle a poll interval"""
        self.stdout.write('Checking sftp server')

        with sftp.get_connection() as sftp_conn:
            with sftp_conn.cd(settings.EXAMS_SFTP_UPLOAD_DIR):
                paths = [path for path in sftp_conn.listdir() if sftp_conn.isfile(path)]

                self.stdout.write('Found {} file(s)'.format(len(paths)))

                for path in paths:
                    time.sleep(2)  # ensures unique filename timestamps
                    self.stdout.write('Found a file: {}/{}'.format(sftp_conn.pwd, path))

                    if path.startswith('ead'):
                        self.handle_ead(sftp_conn, path, ratio)

                    elif path.startswith('cdd'):
                        self.handle_cdd(sftp_conn, path, ratio)
                    else:
                        continue

                    if not keep:
                        sftp_conn.remove(path)

    def handle_ead(self, sftp_conn, remote_path, ratio):
        """Handle an EAD file"""
        now = now_in_utc()
        result_file = io.StringIO()
        writer = csv.DictWriter(result_file, [
            'ClientAuthorizationID',
            'ClientCandidateID',
            'Status',
            'Date',
            'Message',
        ], delimiter='\t')
        writer.writeheader()
        with sftp_conn.open(remote_path, mode='r') as eac_file:
            for row in csv.DictReader(eac_file, delimiter='\t'):
                cid = row['ClientCandidateID']
                aid = row['ClientAuthorizationID']
                error = random.random() > ratio
                status = 'Error' if error else 'Accepted'
                self.stdout.write('Marking authorization {aid} for profile {cid} as {status}'.format(
                    aid=aid,
                    cid=cid,
                    status=status,
                ))
                writer.writerow({
                    'ClientAuthorizationID': aid,
                    'ClientCandidateID': cid,
                    'Status': status,
                    'Date': now.strftime(PEARSON_DATETIME_FORMAT),
                    'Message': 'Invalid ExamSeriesCode' if error else '',
                })

        self.write_zip(
            sftp_conn,
            result_file.getvalue(),
            now.strftime('{}-%Y-%m-%d.dat'.format(PEARSON_FILE_TYPES.EAC)),
            now
        )

    def handle_cdd(self, sftp_conn, remote_path, ratio):
        """Handle a CDD file"""
        now = now_in_utc()
        result_file = io.StringIO()
        writer = csv.DictWriter(result_file, [
            'ClientCandidateID',
            'Status',
            'Date',
            'Message',
        ], delimiter='\t')
        writer.writeheader()
        with sftp_conn.open(remote_path, mode='r') as cdd_file:
            for row in csv.DictReader(cdd_file, delimiter='\t'):
                cid = row['ClientCandidateID']
                error = random.random() > ratio
                status = 'Error' if error else 'Accepted'
                self.stdout.write('Marking profile {cid} as {status}'.format(
                    cid=cid,
                    status=status,
                ))
                writer.writerow({
                    'ClientCandidateID': cid,
                    'Status': 'Error' if error else 'Accepted',
                    'Date': now.strftime(PEARSON_DATETIME_FORMAT),
                    'Message': 'Invalid Address' if error else '',
                })

        self.write_zip(
            sftp_conn,
            result_file.getvalue(),
            now.strftime('{}-%Y-%m-%d.dat'.format(PEARSON_FILE_TYPES.VCDC)),
            now
        )

    def write_zip(self, sftp_conn, data, filename, now):  # pylint: disable=no-self-use
        """Write a zip file to the sftp server"""
        zip_path = os.path.join(
            settings.EXAMS_SFTP_TEMP_DIR,
            now.strftime('ORGNAME-NS-%Y-%m-%d-%H%M%S.zip'),
        )
        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.writestr(filename, data)

        with sftp_conn.cd(settings.EXAMS_SFTP_RESULTS_DIR):
            sftp_conn.put(zip_path)

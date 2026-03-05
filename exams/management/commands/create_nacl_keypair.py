"""Command to generate a NaCl private and public key"""

from django.core.management.base import BaseCommand
from nacl.encoding import Base64Encoder  # pylint: disable=import-error
from nacl.public import PrivateKey  # pylint: disable=import-error


class Command(BaseCommand):
    """Creates a NaCl private and public key"""
    help = 'Creates a NaCl private and public key'

    def handle(self, *args, **options):
        """Handle the command"""
        private_key = PrivateKey.generate()
        public_key = private_key.public_key

        self.stdout.write('--------------------------------------------------------------')
        self.stdout.write('Private Key Base64 Encoded:')
        self.stdout.write(Base64Encoder.encode(bytes(private_key)).decode("utf-8"))
        self.stdout.write('--------------------------------------------------------------')
        self.stdout.write('Public Key Base64 Encoded:')
        self.stdout.write(Base64Encoder.encode(bytes(public_key)).decode("utf-8"))
        self.stdout.write('--------------------------------------------------------------')

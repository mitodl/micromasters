"""
Django Forms for use with financialaid
"""
from django import forms


class FinancialAidEmailForm(forms.Form):
    email_subject = forms.CharField(label="Email Subject")
    email_body = forms.CharField(label="Email Body", widget=forms.Textarea())

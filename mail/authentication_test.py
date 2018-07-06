"""Tests for authentication"""
from mail.authentication import (
    get_encoded_and_signed_subscription_token,
    decode_and_verify_username_from_token,
    StatelessTokenAuthentication,
)


def test_get_encoded_and_signed_subscription_token(user):
    """Tests that get_encoded_and_signed_subscription_token returns a token"""
    assert get_encoded_and_signed_subscription_token(user) is not None


def test_decode_and_verify_username_from_token(user):
    """Tests that decode_and_verify_username_from_token returns the encoded username"""
    token = get_encoded_and_signed_subscription_token(user)
    assert decode_and_verify_username_from_token(token) == user.username


def test_stateless_token_authentication_expired(rf):
    """Tests that StatelessTokenAuthentication returns None if token is expired"""
    token = 'MDFDNEZBV1dFOTc1VDFLRk4wQ0RZNllLUFo6MWVvRTlrOi05V2VacjYxWm9aR25wdTdVUlY2RGFQUXRRSQ=='
    request = rf.get('api/v0/notification_settings', HTTP_AUTHORIZATION='Token {}'.format(token))
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_invalid(rf):
    """Tests that StatelessTokenAuthentication returns None if token is invalid"""
    token = 'can i haz notifications?'
    request = rf.get('api/v0/notification_settings', HTTP_AUTHORIZATION='Token {}'.format(token))
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_valid(rf, user):
    """Tests that StatelessTokenAuthentication returns a user if token is still valid"""
    token = get_encoded_and_signed_subscription_token(user)
    request = rf.get('api/v0/notification_settings', HTTP_AUTHORIZATION='Token {}'.format(token))
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) == (user, None)


def test_stateless_token_authentication_wrong_prefix(rf, user):
    """Tests that StatelessTokenAuthentication nothing if the prefix is different"""
    token = get_encoded_and_signed_subscription_token(user)
    request = rf.get('api/v0/notification_settings', HTTP_AUTHORIZATION='OAuth {}'.format(token))
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_no_header(rf):
    """Tests that StatelessTokenAuthentication returns nothing if no auth header is present"""
    request = rf.get('api/v0/notification_settings')
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None


def test_stateless_token_authentication_no_user(rf, user):
    """Tests that StatelessTokenAuthentication returns nothing if user doesn't exist"""
    token = get_encoded_and_signed_subscription_token(user)
    user.delete()
    request = rf.get('api/v0/notification_settings', HTTP_AUTHORIZATION='Token {}'.format(token))
    authentication = StatelessTokenAuthentication()
    assert authentication.authenticate(request) is None

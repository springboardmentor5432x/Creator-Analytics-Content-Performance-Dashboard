import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.token_security import (
    TokenEncryptionConfigurationError,
    decrypt_token,
    encrypt_token,
)


def test_token_encryption_round_trip_and_ciphertext_is_different():
    key = Fernet.generate_key().decode("ascii")
    plaintext = "sample-youtube-access-token"
    encrypted = encrypt_token(plaintext, key)
    assert encrypted != plaintext
    assert decrypt_token(encrypted, key) == plaintext


def test_encryption_rejects_empty_token():
    with pytest.raises(ValueError):
        encrypt_token("	", Fernet.generate_key().decode("ascii"))


def test_encryption_rejects_invalid_key():
    with pytest.raises(TokenEncryptionConfigurationError):
        encrypt_token("sample-token", "invalid-key")


def test_decryption_rejects_wrong_key():
    key = Fernet.generate_key().decode("ascii")
    wrong_key = Fernet.generate_key().decode("ascii")
    encrypted = encrypt_token("sample-token", key)
    with pytest.raises(InvalidToken):
        decrypt_token(encrypted, wrong_key)


def test_encryption_requires_a_configured_key():
    with pytest.raises(TokenEncryptionConfigurationError):
        encrypt_token("sample-token", "")

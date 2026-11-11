
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


class TokenEncryptionConfigurationError(RuntimeError):
    """Raised when token encryption is not configured correctly."""


def _get_fernet(key: str | None = None) -> Fernet:
    # Use the explicitly supplied key, even if it is empty.
    # Only use the environment setting when key is None.
    encryption_key = (
        settings.oauth_token_encryption_key if key is None else key
    )

    if not isinstance(encryption_key, str) or not encryption_key.strip():
        raise TokenEncryptionConfigurationError(
            "OAuth token encryption key is not configured."
        )

    try:
        return Fernet(encryption_key.encode("utf-8"))
    except (ValueError, TypeError, AttributeError) as exc:
        raise TokenEncryptionConfigurationError(
            "OAuth token encryption key is invalid. "
            "Generate a valid Fernet key."
        ) from exc


def validate_encryption_key() -> None:
    """Validate the configured Fernet encryption key."""
    _get_fernet()


def encrypt_token(token: str, key: str | None = None) -> str:
    """Encrypt a non-empty OAuth token."""
    if not isinstance(token, str) or not token.strip():
        raise ValueError("Token must not be empty.")

    fernet = _get_fernet(key)
    encrypted = fernet.encrypt(token.encode("utf-8"))

    return encrypted.decode("utf-8")


def decrypt_token(encrypted_token: str, key: str | None = None) -> str:
    """Decrypt an OAuth token."""
    if not isinstance(encrypted_token, str) or not encrypted_token.strip():
        raise ValueError("Encrypted token must not be empty.")

    fernet = _get_fernet(key)

    try:
        decrypted = fernet.decrypt(encrypted_token.encode("utf-8"))
    except InvalidToken:
        raise

    return decrypted.decode("utf-8")

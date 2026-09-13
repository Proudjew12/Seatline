from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from ipaddress import ip_address
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

from app.core.validation.text import normalize_text

API_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(API_ROOT / ".env")

ALLOWED_ENVIRONMENTS = frozenset({"development", "test", "production"})
ALLOWED_LOG_LEVELS = frozenset({"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"})
DEFAULT_CORS_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173"
MAX_CORS_ORIGINS = 32
MAX_ORIGIN_LENGTH = 2_048
_HOST_LABEL = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def _read_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        return int(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be an integer") from error


def _normalize_host(value: str) -> str:
    host = normalize_text("APP_HOST", value, maximum_length=253)
    if host.startswith("[") and host.endswith("]"):
        try:
            address = ip_address(host[1:-1])
        except ValueError as error:
            raise ValueError("APP_HOST must be a valid IP address or hostname") from error
        if address.version != 6:
            raise ValueError("Only IPv6 APP_HOST values may use brackets")
        return str(address)
    try:
        return str(ip_address(host))
    except ValueError:
        try:
            normalized = host.encode("idna").decode("ascii").lower().rstrip(".")
        except UnicodeError as error:
            raise ValueError("APP_HOST must be a valid IP address or hostname") from error
        labels = normalized.split(".")
        if len(normalized) > 253 or not all(_HOST_LABEL.fullmatch(label) for label in labels):
            raise ValueError("APP_HOST must be a valid IP address or hostname") from None
        return normalized


def _normalize_origin(raw_origin: str) -> str:
    origin = normalize_text(
        "APP_CORS_ORIGINS entry",
        raw_origin,
        maximum_length=MAX_ORIGIN_LENGTH,
    )
    try:
        parsed = urlsplit(origin)
        port = parsed.port
    except ValueError as error:
        raise ValueError(f"Invalid CORS origin: {origin!r}") from error

    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"}:
        raise ValueError(f"CORS origin must use http or https: {origin!r}")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError(f"CORS origin must not contain credentials: {origin!r}")
    if parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        raise ValueError(f"CORS origin must not contain a path, query, or fragment: {origin!r}")

    hostname = parsed.hostname
    if hostname is None:
        raise ValueError(f"CORS origin must contain a host: {origin!r}")
    try:
        normalized_host = str(ip_address(hostname))
    except ValueError:
        try:
            normalized_host = hostname.encode("idna").decode("ascii").lower()
        except UnicodeError as error:
            raise ValueError(f"CORS origin contains an invalid host: {origin!r}") from error
        labels = normalized_host.rstrip(".").split(".")
        if len(normalized_host) > 253 or not all(_HOST_LABEL.fullmatch(label) for label in labels):
            raise ValueError(f"CORS origin contains an invalid host: {origin!r}") from None
        normalized_host = normalized_host.rstrip(".")

    if port is not None and not 1 <= port <= 65_535:
        raise ValueError(f"CORS origin contains an invalid port: {origin!r}")
    if ":" in normalized_host:
        normalized_host = f"[{normalized_host}]"

    default_port = 80 if scheme == "http" else 443
    port_suffix = "" if port is None or port == default_port else f":{port}"
    return f"{scheme}://{normalized_host}{port_suffix}"


def _read_origins(raw_value: str) -> tuple[str, ...]:
    value = raw_value.strip()
    if not value:
        return ()

    if value.startswith("["):
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError as error:
            raise ValueError("APP_CORS_ORIGINS must be comma-separated or a JSON array") from error
        if not isinstance(decoded, list) or not all(isinstance(item, str) for item in decoded):
            raise ValueError("APP_CORS_ORIGINS JSON value must be an array of strings")
        origins = tuple(item.strip() for item in decoded if item.strip())
    else:
        origins = tuple(item.strip() for item in value.split(",") if item.strip())

    if len(origins) > MAX_CORS_ORIGINS:
        raise ValueError(f"APP_CORS_ORIGINS cannot contain more than {MAX_CORS_ORIGINS} origins")
    return tuple(_normalize_origin(origin) for origin in origins)


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str
    environment: str
    version: str
    host: str
    port: int
    log_level: str
    cors_origins: tuple[str, ...]

    def __post_init__(self) -> None:
        app_name = normalize_text("APP_NAME", self.app_name, maximum_length=100)
        version = normalize_text("APP_VERSION", self.version, maximum_length=64)
        host = _normalize_host(self.host)
        environment = normalize_text(
            "APP_ENV",
            self.environment,
            maximum_length=32,
        ).lower()
        log_level = normalize_text(
            "APP_LOG_LEVEL",
            self.log_level,
            maximum_length=16,
        ).upper()

        if environment not in ALLOWED_ENVIRONMENTS:
            choices = ", ".join(sorted(ALLOWED_ENVIRONMENTS))
            raise ValueError(f"APP_ENV must be one of: {choices}")
        if log_level not in ALLOWED_LOG_LEVELS:
            choices = ", ".join(sorted(ALLOWED_LOG_LEVELS))
            raise ValueError(f"APP_LOG_LEVEL must be one of: {choices}")
        if (
            isinstance(self.port, bool)
            or not isinstance(self.port, int)
            or not 1 <= self.port <= 65_535
        ):
            raise ValueError("APP_PORT must be between 1 and 65535")
        if not isinstance(self.cors_origins, tuple) or not all(
            isinstance(origin, str) for origin in self.cors_origins
        ):
            raise ValueError("APP_CORS_ORIGINS must resolve to a tuple of strings")
        if len(self.cors_origins) > MAX_CORS_ORIGINS:
            raise ValueError(
                f"APP_CORS_ORIGINS cannot contain more than {MAX_CORS_ORIGINS} origins"
            )

        object.__setattr__(self, "app_name", app_name)
        object.__setattr__(self, "environment", environment)
        object.__setattr__(self, "version", version)
        object.__setattr__(self, "host", host)
        object.__setattr__(self, "log_level", log_level)
        object.__setattr__(
            self,
            "cors_origins",
            tuple(_normalize_origin(origin) for origin in self.cors_origins),
        )

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @classmethod
    def from_environment(cls) -> Settings:
        environment = os.getenv("APP_ENV", "development")
        raw_origins = os.getenv("APP_CORS_ORIGINS")
        if environment.strip().lower() == "production" and raw_origins is None:
            raise ValueError(
                "APP_CORS_ORIGINS must be set explicitly in production; "
                "use an empty value to disable cross-origin access"
            )

        return cls(
            app_name=os.getenv("APP_NAME", "Seatline API"),
            environment=environment,
            version=os.getenv("APP_VERSION", "0.1.0"),
            host=os.getenv("APP_HOST", "127.0.0.1"),
            port=_read_int("APP_PORT", 8000),
            log_level=os.getenv("APP_LOG_LEVEL", "INFO"),
            cors_origins=_read_origins(
                DEFAULT_CORS_ORIGINS if raw_origins is None else raw_origins
            ),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_environment()

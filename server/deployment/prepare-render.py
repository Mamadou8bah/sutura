"""Prepare private, matching Render env files for the separate Sutura and Sentinel repos.

Does not contact providers, provision infrastructure, or print credential values.
Run again safely: existing nonempty secrets are never rotated.
"""
import argparse
import base64
import json
from pathlib import Path
import re
import secrets
import sys
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit, urlunsplit


SUTURA_RENDER_KEYS = (
    'SPRING_PROFILES_ACTIVE',
    'SPRING_DATASOURCE_URL',
    'SPRING_DATASOURCE_USERNAME',
    'SPRING_DATASOURCE_PASSWORD',
    'REDIS_URL',
    'JWT_SECRET',
    'SUTURA_CORS_ALLOWED_ORIGINS',
    'SUTURA_SENTINEL_BASE_URL',
    'SUTURA_SENTINEL_CONNECTED',
    'SUTURA_SENTINEL_API_KEY',
    'SUTURA_SENTINEL_TENANT_CODE',
    'SUTURA_SENTINEL_WEBHOOK_SECRET',
    'MODEMPAY_API_KEY',
    'MODEMPAY_ENABLED',
    'MODEMPAY_PUBLIC_KEY',
    'MODEMPAY_WEBHOOK_SIGNING_SECRET',
    'MODEMPAY_API_URL',
    'SUTURA_SMS_PROVIDER',
    'JOKOOR_API_KEY',
    'SUTURA_EMAIL_PROVIDER',
    'SUTURA_EMAIL_API_KEY',
    'SUTURA_EMAIL_FROM',
    'SUTURA_ALERT_EMAIL',
    'SUTURA_BOOTSTRAP_ENABLED',
    'SUTURA_BOOTSTRAP_FIRST_NAME',
    'SUTURA_BOOTSTRAP_LAST_NAME',
    'SUTURA_BOOTSTRAP_EMAIL',
    'SUTURA_BOOTSTRAP_PHONE',
    'SUTURA_BOOTSTRAP_PASSWORD',
)
SENTINEL_RENDER_KEYS = (
    'SPRING_PROFILES_ACTIVE',
    'SPRING_DATASOURCE_URL',
    'SPRING_DATASOURCE_USERNAME',
    'SPRING_DATASOURCE_PASSWORD',
    'JWT_SECRET',
    'FIELD_ENCRYPTION_KEY',
    'SENTINEL_CORS_ALLOWED_ORIGINS',
    'SENTINEL_PUBLIC_BASE_URL',
    'SENTINEL_ML_ENABLED',
    'CV_ML_BASE_URL',
    'TRANSACTION_ML_BASE_URL',
    'ML_SERVICE_API_KEY',
    'SENTINEL_BOOTSTRAP_ENABLED',
    'SENTINEL_BOOTSTRAP_TENANT_CODE',
    'SENTINEL_BOOTSTRAP_ADMIN_USERNAME',
    'SENTINEL_BOOTSTRAP_ADMIN_PASSWORD',
    'SENTINEL_BOOTSTRAP_API_KEY',
    'SENTINEL_BOOTSTRAP_WEBHOOK_SECRET',
    'SENTINEL_BOOTSTRAP_WEBHOOK_URL',
)

def read_env(path):
    values = {}
    if path.exists():
        for raw in path.read_text(encoding="utf-8-sig").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.removeprefix("export ").split("=", 1)
            value = value.strip()
            if value.startswith('"') and value.endswith('"'):
                value = json.loads(value)
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            values[key.strip()] = value
    return values


def write_env(path, values):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation protects a new credential file before any bytes are written.
    if not path.exists():
        path.touch(mode=0o600, exist_ok=False)
    content = "# PRIVATE: fill required settings before importing into Render. Never commit.\n"
    database_keys = ("SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD", "REDIS_URL")
    if any(key in values for key in database_keys):
        content += "\n# DATABASE: JDBC URL (jdbc:postgresql://HOST:5432/DATABASE), username and password.\n"
        content += "# Do not paste Render's postgresql://user:password@host/database URL directly.\n"
        for key in database_keys:
            if key in values:
                if key == "REDIS_URL":
                    content += "\n# CACHE: Render Key Value internal connection URL (redis://...).\n"
                content += f"{key}={json.dumps(values[key])}\n"
    content += "\n# APPLICATION AND INTEGRATIONS\n"
    content += "\n".join(f"{key}={json.dumps(value)}" for key, value in values.items() if key not in database_keys) + "\n"
    path.write_text(content, encoding="utf-8")


def prepare(sutura, sentinel, sutura_url=None, sentinel_url=None):
    a_path, b_path = sutura / "server/.env.render", sentinel / ".env.render"
    a_template = read_env(sutura / "server/.env.example")
    b_template = read_env(sentinel / ".env.example")
    a = {key: a_template.get(key, "") for key in SUTURA_RENDER_KEYS}
    b = {key: b_template.get(key, "") for key in SENTINEL_RENDER_KEYS}
    a.update({"SPRING_PROFILES_ACTIVE": "prod,render,render-free",
              "SUTURA_BOOTSTRAP_ENABLED": "true", "SUTURA_SENTINEL_TENANT_CODE": "sutura"})
    # Never carry local demo keys, localhost inference URLs or development DB credentials to Render.
    b.update({key: "" for key in ("JWT_SECRET",
              "FIELD_ENCRYPTION_KEY", "SENTINEL_PUBLIC_BASE_URL", "CV_ML_BASE_URL",
              "TRANSACTION_ML_BASE_URL", "ML_SERVICE_API_KEY")})
    b.update({"SPRING_PROFILES_ACTIVE": "render", "SENTINEL_ML_ENABLED": "false",
              "SENTINEL_BOOTSTRAP_ENABLED": "true"})
    a.update(read_env(a_path))
    b.update(read_env(b_path))
    migrate_database(b)
    for key, value in read_env(sutura / "server/.env").items():
        if key in a and value and not a[key]:
            a[key] = value
    normalize_datasource(a)
    for key in ("SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD"):
        if not b.get(key) and a.get(key):
            b[key] = a[key]
    normalize_datasource(b)
    for values, key in [(a, "JWT_SECRET"), (b, "JWT_SECRET"), (b, "FIELD_ENCRYPTION_KEY")]:
        if not values.get(key):
            values[key] = base64.b64encode(secrets.token_bytes(48)).decode()
    for left, right in [
        ("SUTURA_SENTINEL_API_KEY", "SENTINEL_BOOTSTRAP_API_KEY"),
        ("SUTURA_SENTINEL_WEBHOOK_SECRET", "SENTINEL_BOOTSTRAP_WEBHOOK_SECRET"),
        ("SUTURA_SENTINEL_TENANT_CODE", "SENTINEL_BOOTSTRAP_TENANT_CODE"),
    ]:
        if a.get(left) and b.get(right) and a[left] != b[right]:
            raise ValueError(f"Resolve mismatched {left} and {right}; existing secrets were not changed")
        value = a.get(left) or b.get(right) or secrets.token_urlsafe(36)
        a[left] = b[right] = value
    for values, key in [
        (a, "MODEMPAY_WEBHOOK_SIGNING_SECRET"),
        (a, "SUTURA_BOOTSTRAP_PASSWORD"),
        (b, "SENTINEL_BOOTSTRAP_ADMIN_PASSWORD"),
        (b, "ML_SERVICE_API_KEY"),
    ]:
        if not values.get(key):
            values[key] = secrets.token_urlsafe(36)
    if sentinel_url:
        a["SUTURA_SENTINEL_BASE_URL"] = origin(sentinel_url)
    if sutura_url:
        b["SENTINEL_BOOTSTRAP_WEBHOOK_URL"] = origin(sutura_url) + "/api/v1/webhooks/sentinel"
    write_env(a_path, a)
    write_env(b_path, b)
    return a, b


def origin(value):
    uri = urlsplit(value)
    if (uri.scheme != "https" or not uri.hostname or uri.username or uri.password
            or uri.query or uri.fragment or uri.path not in ("", "/")
            or uri.hostname in ("localhost", "example.com")
            or uri.hostname.endswith((".example.com", ".example", ".invalid"))):
        raise ValueError("Service URLs and allowed origins must use HTTPS without a path")
    return value.rstrip("/")


def migrate_database(values):
    """Preserve credentials in older private files while using standard Spring names."""
    if not values.get("SPRING_DATASOURCE_URL") and values.get("RENDER_DB_HOST") and values.get("RENDER_DB_NAME"):
        values["SPRING_DATASOURCE_URL"] = (
            f"jdbc:postgresql://{values['RENDER_DB_HOST']}:{values.get('RENDER_DB_PORT') or '5432'}/{values['RENDER_DB_NAME']}")
    for standard, old in [("SPRING_DATASOURCE_USERNAME", "POSTGRES_USER"),
                          ("SPRING_DATASOURCE_PASSWORD", "POSTGRES_PASSWORD")]:
        if not values.get(standard) and values.get(old):
            values[standard] = values[old]
    for key in ("RENDER_DB_HOST", "RENDER_DB_PORT", "RENDER_DB_NAME", "POSTGRES_USER", "POSTGRES_PASSWORD"):
        values.pop(key, None)


def normalize_datasource(values):
    """Separate credentials embedded in PostgreSQL/JDBC URLs without discarding TLS settings."""
    value = values.get("SPRING_DATASOURCE_URL", "")
    if not value:
        return
    uri = urlsplit(value[5:] if value.startswith("jdbc:") else value)
    if uri.scheme not in ("postgres", "postgresql") or not uri.hostname or not uri.path.strip("/"):
        raise ValueError("Invalid PostgreSQL datasource URL")
    credentials = {}
    if uri.username:
        credentials["SPRING_DATASOURCE_USERNAME"] = unquote(uri.username)
    if uri.password:
        credentials["SPRING_DATASOURCE_PASSWORD"] = unquote(uri.password)
    options = []
    for key, item in parse_qsl(uri.query, keep_blank_values=True):
        if key.lower() in ("user", "username", "password"):
            target = "SPRING_DATASOURCE_PASSWORD" if key.lower() == "password" else "SPRING_DATASOURCE_USERNAME"
            if target in credentials and credentials[target] != item:
                raise ValueError("Conflicting embedded datasource credentials")
            credentials[target] = item
        else:
            options.append((key, item))
    for key, item in credentials.items():
        if values.get(key) and values[key] != item:
            raise ValueError("Conflicting datasource credential settings")
        values[key] = item
    values["SPRING_DATASOURCE_URL"] = "jdbc:" + urlunsplit(
        ("postgresql", uri.netloc.rsplit("@", 1)[-1], uri.path, urlencode(options), ""))


def check(a, b):
    issues = []
    required_a = ["SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD", "REDIS_URL",
                  "JWT_SECRET",
                  "SUTURA_SENTINEL_API_KEY", "SUTURA_SENTINEL_TENANT_CODE",
                  "SUTURA_SENTINEL_WEBHOOK_SECRET", "JOKOOR_API_KEY", "SUTURA_EMAIL_API_KEY",
                  "SUTURA_EMAIL_FROM", "SUTURA_ALERT_EMAIL"]
    if a.get("SUTURA_SENTINEL_CONNECTED", "true").lower() == "true":
        required_a += ["SUTURA_SENTINEL_BASE_URL"]
    if a.get("MODEMPAY_ENABLED", "true").lower() == "true":
        required_a += ["MODEMPAY_API_KEY", "MODEMPAY_WEBHOOK_SIGNING_SECRET"]
    required_b = ["SPRING_DATASOURCE_URL", "SPRING_DATASOURCE_USERNAME", "SPRING_DATASOURCE_PASSWORD",
                  "JWT_SECRET", "FIELD_ENCRYPTION_KEY", "SENTINEL_CORS_ALLOWED_ORIGINS",
                  "SENTINEL_PUBLIC_BASE_URL"]
    if a.get("SUTURA_BOOTSTRAP_ENABLED", "false").lower() == "true":
        required_a += ["SUTURA_BOOTSTRAP_" + key for key in
                       ("FIRST_NAME", "LAST_NAME", "EMAIL", "PHONE", "PASSWORD")]
    if b.get("SENTINEL_BOOTSTRAP_ENABLED", "false").lower() == "true":
        required_b += ["SENTINEL_BOOTSTRAP_" + key for key in
                       ("TENANT_CODE", "ADMIN_USERNAME", "ADMIN_PASSWORD", "API_KEY",
                        "WEBHOOK_SECRET", "WEBHOOK_URL")]
    if b.get("SENTINEL_ML_ENABLED", "true").lower() == "true":
        required_b += ["CV_ML_BASE_URL", "TRANSACTION_ML_BASE_URL", "ML_SERVICE_API_KEY"]
    for label, values, required in [("Sutura", a, required_a), ("Sentinel", b, required_b)]:
        for key in required:
            if not values.get(key):
                issues.append(f"{label}: fill {key}")
        jdbc = values.get("SPRING_DATASOURCE_URL", "")
        if jdbc:
            try:
                if not jdbc.startswith("jdbc:postgresql://"):
                    raise ValueError()
                database = urlsplit(jdbc[5:])
                if not database.hostname or not database.path.strip("/") or database.username or database.password:
                    raise ValueError()
            except ValueError:
                issues.append(f"{label}: SPRING_DATASOURCE_URL must use jdbc:postgresql://HOST:5432/DATABASE; supply credentials separately")
    for values, keys in [(a, ["SUTURA_SENTINEL_BASE_URL"] if a.get("SUTURA_SENTINEL_CONNECTED", "true").lower() == "true" else []),
                          (b, ["SENTINEL_PUBLIC_BASE_URL"] +
                           (["CV_ML_BASE_URL", "TRANSACTION_ML_BASE_URL"]
                            if b.get("SENTINEL_ML_ENABLED", "true").lower() == "true" else []))]:
        for key in keys:
            if values.get(key):
                try:
                    origin(values[key])
                except ValueError:
                    issues.append(f"Invalid HTTPS origin: {key}")
    for values, key in [(a, "SUTURA_CORS_ALLOWED_ORIGINS"), (b, "SENTINEL_CORS_ALLOWED_ORIGINS")]:
        for value in values.get(key, "").split(","):
            if value:
                try:
                    origin(value.strip())
                    if value.strip().endswith("/"):
                        raise ValueError()
                except ValueError:
                    issues.append(f"Invalid exact HTTPS origin: {key}")
    if a.get("JOKOOR_API_KEY") and not re.fullmatch(r"sk_live_.+", a["JOKOOR_API_KEY"]):
        issues.append("Sutura: JOKOOR_API_KEY must be a live key")
    for left, right in [
        ("SUTURA_SENTINEL_API_KEY", "SENTINEL_BOOTSTRAP_API_KEY"),
        ("SUTURA_SENTINEL_WEBHOOK_SECRET", "SENTINEL_BOOTSTRAP_WEBHOOK_SECRET"),
        ("SUTURA_SENTINEL_TENANT_CODE", "SENTINEL_BOOTSTRAP_TENANT_CODE"),
    ]:
        if a.get(left) and b.get(right) and a[left] != b[right]:
            issues.append(f"Integration mismatch: {left} must match {right}")
    return issues


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    default_sutura = Path(__file__).resolve().parents[2]
    parser.add_argument("--sutura-dir", type=Path, default=default_sutura)
    parser.add_argument("--sentinel-dir", type=Path, default=default_sutura.parent / "sentinel")
    parser.add_argument("--sutura-url")
    parser.add_argument("--sentinel-url")
    parser.add_argument("--check", action="store_true", help="Check existing files without changing them")
    args = parser.parse_args()
    if args.check:
        a = read_env(args.sutura_dir / "server/.env.render")
        b = read_env(args.sentinel_dir / ".env.render")
    else:
        a, b = prepare(args.sutura_dir, args.sentinel_dir, args.sutura_url, args.sentinel_url)
        print("Prepared sutura/server/.env.render and sentinel/.env.render; values are private.")
    issues = check(a, b)
    for issue in issues:
        print(issue)
    print("Fill the datasource and cache fields from Render before importing these env files.")
    print("No provider credentials or live delivery were verified.")
    return 1 if issues else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError):
        print("Deployment preparation failed; check paths, URL format and matching integration settings.", file=sys.stderr)
        sys.exit(1)

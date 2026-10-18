"""Read-only health, authorization and CORS checks for a deployed Sutura API."""
import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request


def check(base, path, expected, headers=None, method="GET"):
    request = urllib.request.Request(base + path, headers=headers or {}, method=method)
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        if response.status != expected:
            raise RuntimeError(f"{method} {path}: expected {expected}, received {response.status}")
        return response.headers, response.read(65536)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--origin", required=True)
    args = parser.parse_args()
    uri = urllib.parse.urlsplit(args.api_url)
    if uri.scheme != "https" or not uri.hostname or uri.username or uri.query or uri.fragment or uri.path not in ("", "/"):
        parser.error("--api-url must be an HTTPS origin")
    base = args.api_url.rstrip("/")
    for path in ("/actuator/health/liveness", "/actuator/health/readiness"):
        _, body = check(base, path, 200)
        if json.loads(body).get("status") != "UP":
            raise RuntimeError(f"{path} is not UP")
        print(f"PASS {path}")
    check(base, "/api/v1/admin/operations/customers", 401)
    headers, _ = check(base, "/api/auth/login", 200, {
        "Origin": args.origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
    }, "OPTIONS")
    if headers.get("Access-Control-Allow-Origin") != args.origin:
        raise RuntimeError("CORS did not allow the configured origin")
    denied, _ = check(base, "/api/auth/login", 403, {
        "Origin": "https://untrusted-origin.invalid",
        "Access-Control-Request-Method": "POST",
    }, "OPTIONS")
    if denied.get("Access-Control-Allow-Origin"):
        raise RuntimeError("CORS allowed an untrusted origin")
    print("PASS authentication boundary and CORS")
    print("Payment and OTP acceptance require separate checks.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, urllib.error.URLError, ValueError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)

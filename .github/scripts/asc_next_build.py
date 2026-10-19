"""Pick the next TestFlight build number from App Store Connect (used by ios-release.yml).

Reads KEY_PATH (decoded .p8), ASC_KEY_ID, ASC_ISSUER_ID, BUNDLE_ID, MIN_BUILD_NUMBER and an
optional BUILD_NUMBER_INPUT. Confirms that exactly one App Store Connect app has BUNDLE_ID,
then writes BUILD_NUMBER and ASC_BUILD_CONFIRMED to GITHUB_ENV. Never prints the key or token.
"""

import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.appstoreconnect.apple.com"


def fail(message):
    print(f"::error::{message}")
    sys.exit(1)


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=")


def der_to_raw(der):
    """ECDSA-Sig-Value (DER) -> 64-byte r||s, as JWS ES256 requires."""
    if der[0] != 0x30:
        raise ValueError("not a DER sequence")
    i = 2 if der[1] < 0x80 else 2 + (der[1] & 0x7F)
    parts = []
    for _ in range(2):
        if der[i] != 0x02:
            raise ValueError("not a DER integer")
        length = der[i + 1]
        parts.append(der[i + 2 : i + 2 + length].lstrip(b"\0").rjust(32, b"\0"))
        i += 2 + length
    return parts[0] + parts[1]


def make_token(key_path, key_id, issuer):
    now = int(time.time())
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    claims = {"iss": issuer, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"}
    signing_input = b64url(json.dumps(header).encode()) + b"." + b64url(json.dumps(claims).encode())
    result = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", key_path],
        input=signing_input, capture_output=True, check=False,
    )
    if result.returncode != 0:
        fail("Could not sign the App Store Connect token (check ASC_KEY_P8_BASE64)")
    return (signing_input + b"." + b64url(der_to_raw(result.stdout))).decode()


def get(url, token):
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        fail(f"App Store Connect API returned HTTP {error.code} for {urllib.parse.urlparse(url).path}")
    except urllib.error.URLError:
        fail("App Store Connect API is unreachable")


def main():
    env = os.environ
    bundle = env["BUNDLE_ID"]
    minimum = int(env["MIN_BUILD_NUMBER"])
    requested = env.get("BUILD_NUMBER_INPUT", "").strip()
    token = make_token(env["KEY_PATH"], env["ASC_KEY_ID"], env["ASC_ISSUER_ID"])

    query = urllib.parse.urlencode({"filter[bundleId]": bundle, "fields[apps]": "bundleId,name"})
    apps = [a for a in get(f"{API}/v1/apps?{query}", token)["data"] if a["attributes"]["bundleId"] == bundle]
    if len(apps) != 1:
        fail(f"Expected exactly one App Store Connect app with bundle ID {bundle}, found {len(apps)}")
    app = apps[0]

    numbers = set()
    query = urllib.parse.urlencode({"filter[app]": app["id"], "fields[builds]": "version", "limit": "200"})
    url = f"{API}/v1/builds?{query}"
    while url:
        page = get(url, token)
        for build in page["data"]:
            version = build["attributes"].get("version") or ""
            if version.isdigit():
                numbers.add(int(version))
        url = page.get("links", {}).get("next")
    highest = max(numbers, default=0)

    if requested:
        if not requested.isdigit():
            fail("Requested build number is not a positive integer")
        number = int(requested)
        if number < minimum or number in numbers or number <= highest:
            fail(f"Build number {number} must be >= {minimum} and higher than the latest uploaded build ({highest})")
    else:
        number = max(highest + 1, minimum)

    with open(env["GITHUB_ENV"], "a") as out:
        out.write(f"BUILD_NUMBER={number}\nASC_BUILD_CONFIRMED={number}\n")
    print(f"App Store Connect app '{app['attributes']['name']}' ({bundle}): "
          f"{len(numbers)} uploaded build(s), highest {highest}; using build {number}.")


if __name__ == "__main__":
    main()

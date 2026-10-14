"""Check that granted entitlements cover what the app requests (used by ios-release.yml).

Usage: check_entitlements.py <requested.entitlements> <granted.plist> <profile|signed>
  profile: <granted.plist> is a decoded provisioning profile; its Entitlements are checked.
  signed:  <granted.plist> holds the entitlements of a signed app (codesign --entitlements).
Every requested key must be granted: true stays true, list items must all be allowed, strings
must match (a profile may grant a trailing "*" wildcard). Prints key names only, never values.
"""

import plistlib
import sys


def allowed(granted, item):
    return item in granted or any(isinstance(g, str) and g.endswith("*") and str(item).startswith(g[:-1]) for g in granted)


def covers(requested, granted):
    if isinstance(requested, bool):
        return granted is True if requested else granted in (None, False)
    if isinstance(requested, list):
        # An empty list (e.g. healthkit.access without clinical records) needs nothing granted.
        if not requested:
            return granted is None or isinstance(granted, list)
        return isinstance(granted, list) and all(allowed(granted, item) for item in requested)
    if isinstance(requested, str):
        return isinstance(granted, str) and (granted == requested or (granted.endswith("*") and requested.startswith(granted[:-1])))
    return requested == granted


def main():
    requested_path, granted_path, mode = sys.argv[1:4]
    with open(requested_path, "rb") as f:
        requested = plistlib.load(f)
    with open(granted_path, "rb") as f:
        granted = plistlib.load(f)
    if mode == "profile":
        granted = granted.get("Entitlements", {})
    missing = sorted(key for key, value in requested.items() if not covers(value, granted.get(key)))
    for key in missing:
        print(f"::error::{mode} does not grant the entitlement {key} requested by the app")
    if missing:
        sys.exit(1)
    print(f"{mode}: grants all {len(requested)} requested entitlement(s): {', '.join(sorted(requested)) or 'none'}")


if __name__ == "__main__":
    main()

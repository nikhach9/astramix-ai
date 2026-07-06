"""
Test setup for the `astramix` core package dependency.

Preferred (production-matching) setup:
    pip install -e ../astramix

If the real package isn't installed — e.g. in a CI job that only
checks out this backend repo — fall back to a minimal stub package
(tests/_astramix_stub/astramix/) that only reproduces the *shapes*
(function signatures, dataclasses) documented in each service's
docstring. Tests never rely on the stub's internal logic — every test
that exercises astramix-backed behavior monkeypatches the specific
function it needs, exactly as it would against the real package.
This only prevents pytest from failing during collection when the
real package is absent.
"""
import importlib.util
import sys
from pathlib import Path

if importlib.util.find_spec("astramix") is None:
    stub_dir = Path(__file__).parent / "_astramix_stub"
    sys.path.insert(0, str(stub_dir))

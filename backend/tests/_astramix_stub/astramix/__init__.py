"""
Lightweight stand-in for the real `astramix` core package, used ONLY
for test collection when the real package isn't installed (see
tests/conftest.py). It exists purely so `import astramix...` succeeds
at collection time — every test that actually exercises behavior
monkeypatches the specific function it needs, exactly as it would
against the real package.

Do not use this in production. Install the real package instead:
    pip install -e ../astramix
"""

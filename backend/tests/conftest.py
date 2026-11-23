"""
Test setup for the `astramix` core package and `app` dependency.
Ensures `backend/src` and `backend` from the current repository checkout
are first on `sys.path` and evicts any stale site-packages copy.
"""
import importlib.util
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = BACKEND_DIR / "src"

if str(BACKEND_DIR) in sys.path:
    sys.path.remove(str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR))

if SRC_DIR.exists():
    if str(SRC_DIR) in sys.path:
        sys.path.remove(str(SRC_DIR))
    sys.path.insert(0, str(SRC_DIR))

for mod_name in list(sys.modules.keys()):
    if mod_name == "astramix" or mod_name.startswith("astramix.") or mod_name == "app" or mod_name.startswith("app."):
        sys.modules.pop(mod_name, None)

if importlib.util.find_spec("astramix") is None:
    stub_dir = Path(__file__).parent / "_astramix_stub"
    sys.path.insert(0, str(stub_dir))

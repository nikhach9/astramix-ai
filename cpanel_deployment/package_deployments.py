"""Compatibility entry point for the canonical, explicit-snapshot packager."""
from pathlib import Path
import runpy

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).resolve().parents[1] / 'create_final_packages.py'), run_name='__main__')

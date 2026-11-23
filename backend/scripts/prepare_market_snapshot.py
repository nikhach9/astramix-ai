"""Build a new SQLite market snapshot from the versioned research sources."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from astramix.market.db import ensure_market_seeded


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='New database path; existing files are never overwritten.')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Output already exists. Choose a new path to preserve existing records.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    print(json.dumps(ensure_market_seeded(db_path=args.output.resolve()), indent=2))


if __name__ == '__main__':
    main()

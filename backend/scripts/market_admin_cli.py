#!/usr/bin/env python3
"""
AstraMix Materials Market Admin CLI.

Supports:
- stage-import: Stage research pack (market_seed.json, sources.json, input_bounds_reference.json)
- approve-import: Approve and commit a staged import batch
- bootstrap: Ensure database is initialized and research seed is committed
- overview: Print current database coverage counts
- audit-logs: Print recent audit log entries
"""
import argparse
import json
import sys
from pathlib import Path

# Add backend/src to path
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT / "src"))

from astramix.market.db import (
    approve_staged_import,
    ensure_market_seeded,
    import_50_country_refresh,
    stage_research_pack,
)
from astramix.market.service import admin_list_audit_logs, get_market_overview


def main() -> int:
    parser = argparse.ArgumentParser(description="AstraMix Materials Market Admin CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("bootstrap", help="Initialize database and seed research pack if empty")

    p_imp50 = sub.add_parser(
        "import-50",
        help="Idempotently import the 50-country research package and Cameroon supplement",
    )
    p_imp50.add_argument("--actor", default="cli_admin", help="Admin actor identifier")

    p_stage = sub.add_parser("stage-import", help="Stage research pack for validation & review")
    p_stage.add_argument("--actor", default="cli_admin", help="Admin actor identifier")

    p_app = sub.add_parser("approve-import", help="Approve and commit a staged import batch")
    p_app.add_argument("batch_id", help="Staged batch ID to approve")
    p_app.add_argument("--approver", default="cli_admin", help="Approver actor identifier")

    sub.add_parser("overview", help="Show Materials Market coverage summary")

    p_aud = sub.add_parser("audit-logs", help="List recent audit log entries")
    p_aud.add_argument("--limit", type=int, default=20)

    args = parser.parse_args()

    if args.command == "bootstrap":
        res = ensure_market_seeded()
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.command == "import-50":
        res = import_50_country_refresh(actor=args.actor)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.command == "stage-import":
        res = stage_research_pack(actor=args.actor)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.command == "approve-import":
        res = approve_staged_import(batch_id=args.batch_id, approver=args.approver)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    elif args.command == "overview":
        res = get_market_overview()
        print(json.dumps(res["coverage"], indent=2, ensure_ascii=False))
    elif args.command == "audit-logs":
        res = admin_list_audit_logs(limit=args.limit)
        print(json.dumps(res, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


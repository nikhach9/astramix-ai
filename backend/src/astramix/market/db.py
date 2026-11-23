"""
SQLite persistence, staged research pack import, 50-country market refresh
migration, deduplication, data-quality quarantine, and audit logging for
AstraMix Materials Market.

Test fixtures can override ASTRAMIX_MARKET_DB_PATH to an isolated temporary
database so test runs never pollute public production data.
"""
from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_project_root() -> Path:
    return Path(__file__).resolve().parents[4]


def get_research_pack_dir() -> Path:
    env_dir = os.environ.get("ASTRAMIX_RESEARCH_PACK_DIR")
    if env_dir:
        return Path(env_dir)
    return get_project_root() / "data" / "research_pack" / "AstraMix_Upgrade"


def get_research_pack_50_dir() -> Path:
    env_dir = os.environ.get("ASTRAMIX_RESEARCH_PACK_50_DIR")
    if env_dir:
        return Path(env_dir)
    return get_project_root() / "data" / "research_pack_50" / "astramix_market_fix"


def get_db_path() -> Path:
    env_path = os.environ.get("ASTRAMIX_MARKET_DB_PATH")
    if env_path:
        p = Path(env_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p
    default_path = get_project_root() / "data" / "market" / "astramix_market.db"
    default_path.parent.mkdir(parents=True, exist_ok=True)
    return default_path


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    path = db_path or get_db_path()
    conn = sqlite3.connect(str(path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


# Explicit alias mapping between legacy 2026-10-17 seed IDs and 2026-10-18 50-country IDs
LEGACY_SUPPLIER_ALIASES: Dict[str, str] = {
    "am_091": "am-erkat",
    "am_092": "am-mmleader",
    "us_093": "us-gehring",
    "ca_094": "ca-dufferin",
    "ca_047": "ca-heidelberg",
    "au_102": "au-bunnings",
    "fr_103": "fr-leroy-merlin",
    "pt_104": "pt-leroy-merlin",
    "es_105": "es-obramat",
    "za_106": "za-cashbuild",
    "cl_112": "cl-sodimac",
    "nz_089": "nz-mitre10",
    "ng_066": "ng-dangote",
    "mx_076": "mx-cemex",
    "cm_052": "cm_052",
}


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS countries (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    display_currency TEXT NOT NULL,
    coverage_status TEXT NOT NULL,
    price_snapshot_count INTEGER NOT NULL DEFAULT 0,
    benchmark_reference_count INTEGER NOT NULL DEFAULT 0,
    live_inventory_connected INTEGER NOT NULL DEFAULT 0,
    live_supplier_quote_count INTEGER NOT NULL DEFAULT 0,
    country_price_average TEXT,
    source_observed_at TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL,
    market_refresh_status TEXT DEFAULT 'locality_and_prior_lead_fallback_not_part_of_50_market_refresh',
    locales_json TEXT DEFAULT '[]',
    location_suggestion_count INTEGER DEFAULT 0,
    supplier_or_network_records INTEGER DEFAULT 0,
    external_discovery_records INTEGER DEFAULT 0,
    branch_or_contact_locations INTEGER DEFAULT 0,
    retail_or_distributor_locations INTEGER DEFAULT 0,
    external_retail_directory_branches INTEGER DEFAULT 0,
    single_numeric_price_observations INTEGER DEFAULT 0,
    price_range_observations INTEGER DEFAULT 0,
    availability_observations INTEGER DEFAULT 0,
    external_catalog_observations INTEGER DEFAULT 0,
    physical_branch_coordinates INTEGER DEFAULT 0,
    published_price_coverage INTEGER DEFAULT 0,
    requires_quote_for_numeric_pricing INTEGER DEFAULT 1,
    verified_review_sets INTEGER DEFAULT 0,
    discovery_source_urls_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS sources (
    source_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL,
    observed_at TEXT,
    observation_method TEXT,
    evidence_summary TEXT,
    raw_json TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    record_type TEXT NOT NULL,
    source_ids_json TEXT NOT NULL,
    source_url TEXT,
    product_categories_json TEXT NOT NULL,
    branch_id TEXT,
    latitude REAL,
    longitude REAL,
    delivery_area TEXT,
    online_stock TEXT,
    customer_rating REAL,
    review_count INTEGER NOT NULL DEFAULT 0,
    supplier_confirmed_at TEXT,
    commercial_status TEXT NOT NULL,
    eligible_for_nearest INTEGER NOT NULL DEFAULT 0,
    eligible_for_cheapest INTEGER NOT NULL DEFAULT 0,
    shared_pricing_notes TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    source_urls_json TEXT DEFAULT '[]',
    source_checked_at TEXT,
    merchant_confirmed_at TEXT,
    delivery_area_confirmed TEXT,
    website_or_directory_url TEXT,
    stock_status TEXT DEFAULT 'unknown',
    stock_confirmed_at TEXT,
    discovery_scope TEXT,
    recommendation_eligible INTEGER NOT NULL DEFAULT 1,
    brand TEXT,
    city TEXT,
    address_text TEXT,
    phone_e164 TEXT,
    aliased_to_supplier_id TEXT,
    data_origin TEXT DEFAULT 'legacy_seed'
);

CREATE TABLE IF NOT EXISTS branches (
    branch_id TEXT PRIMARY KEY,
    supplier_id TEXT,
    country_code TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    latitude REAL,
    longitude REAL,
    dispatch_radius_km REAL,
    phone TEXT,
    email TEXT,
    opening_hours TEXT,
    verified_status TEXT NOT NULL DEFAULT 'verified_branch',
    source_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    display_name TEXT,
    address_text TEXT,
    phone_e164 TEXT,
    location_role TEXT DEFAULT 'retail_branch',
    retail_access_claimed INTEGER DEFAULT 1,
    source_ids_json TEXT DEFAULT '[]',
    source_urls_json TEXT DEFAULT '[]',
    source_checked_at TEXT,
    merchant_confirmed_at TEXT,
    coordinate_kind TEXT,
    coordinate_source TEXT,
    geocode_status TEXT DEFAULT 'not_geocoded',
    eligible_for_nearest INTEGER DEFAULT 0,
    stock_status TEXT DEFAULT 'unknown',
    stock_quantity INTEGER,
    stock_confirmed_at TEXT,
    delivery_area_confirmed TEXT,
    customer_rating REAL,
    review_count INTEGER DEFAULT 0,
    brand TEXT,
    product_categories_json TEXT DEFAULT '[]',
    notes TEXT,
    data_origin TEXT DEFAULT 'global_market_50'
);

CREATE TABLE IF NOT EXISTS price_snapshots (
    price_id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    branch_id TEXT,
    source_ids_json TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    specification_json TEXT NOT NULL,
    original_amount TEXT NOT NULL,
    original_currency TEXT NOT NULL,
    original_unit TEXT,
    pack_mass_kg REAL,
    bulk_density_kg_per_m3 REAL,
    normalized_value TEXT,
    normalized_currency TEXT,
    normalized_unit TEXT,
    published_gross_amount TEXT,
    tax_included INTEGER,
    vat_rate_pct TEXT,
    delivery_inclusion TEXT NOT NULL,
    effective_from TEXT,
    valid_until TEXT,
    observed_at TEXT,
    supplier_confirmed_at TEXT,
    price_status TEXT NOT NULL,
    is_live INTEGER NOT NULL DEFAULT 0,
    eligible_for_cheapest INTEGER NOT NULL DEFAULT 0,
    eligible_for_production_benchmark INTEGER NOT NULL DEFAULT 0,
    grade_mapping_status TEXT,
    stock_status TEXT,
    min_order_qty TEXT,
    min_order_fee TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    amount_numeric REAL,
    amount_min REAL,
    amount_max REAL,
    sku TEXT,
    source_grade TEXT,
    source_url TEXT,
    source_effective_at TEXT,
    evidence_status TEXT DEFAULT 'unconfirmed_publication_snapshot',
    price_kind TEXT DEFAULT 'public_catalog_snapshot',
    delivery_fee TEXT,
    handling_fee TEXT,
    delivery_area_confirmed TEXT,
    stock_confirmed_at TEXT,
    quantity_min INTEGER,
    quantity_max INTEGER,
    customer_tier TEXT DEFAULT 'unspecified',
    payment_condition TEXT,
    product_origin_country TEXT,
    air_entrainment TEXT,
    intended_use_claim TEXT,
    service_area_claim TEXT,
    location_context TEXT,
    delivery_included_claim TEXT,
    normalized_amount_per_kg REAL,
    normalized_amount_per_m3 REAL,
    normalization_scope TEXT,
    display_caveat TEXT,
    eligible_for_cheapest_delivered INTEGER DEFAULT 0,
    data_origin TEXT DEFAULT 'legacy_seed',
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS availability_observations (
    observation_id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    supplier_id TEXT,
    branch_id TEXT,
    sku TEXT,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    city TEXT,
    published_claim TEXT NOT NULL,
    claim_scope TEXT,
    website_reported_quantity INTEGER,
    confirmed_quantity INTEGER,
    published_mass_kg REAL,
    price_access TEXT,
    stock_status TEXT DEFAULT 'unknown',
    stock_confirmed_at TEXT,
    is_live_inventory INTEGER NOT NULL DEFAULT 0,
    observed_at TEXT,
    source_effective_at TEXT,
    source_ids_json TEXT NOT NULL DEFAULT '[]',
    source_url TEXT,
    notes TEXT,
    data_origin TEXT DEFAULT 'global_market_50',
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cameroon_discovery_records (
    record_id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    record_type TEXT NOT NULL,
    city TEXT,
    address_text TEXT,
    phone_e164 TEXT,
    brand TEXT,
    product_categories_json TEXT NOT NULL DEFAULT '[]',
    category_evidence_scope TEXT,
    source_ids_json TEXT NOT NULL DEFAULT '[]',
    source_urls_json TEXT NOT NULL DEFAULT '[]',
    source_checked_at TEXT,
    merchant_confirmed_at TEXT,
    listing_status TEXT,
    stock_status TEXT DEFAULT 'unknown',
    stock_confirmed_at TEXT,
    stock_quantity INTEGER,
    delivery_area_confirmed TEXT,
    opening_hours_published TEXT,
    latitude REAL,
    longitude REAL,
    coordinate_source TEXT,
    geocode_status TEXT DEFAULT 'not_geocoded',
    eligible_for_nearest INTEGER NOT NULL DEFAULT 0,
    eligible_for_cheapest INTEGER NOT NULL DEFAULT 0,
    customer_rating REAL,
    review_count INTEGER,
    notes TEXT,
    raw_json TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_quality_actions (
    action_id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    supplier_id TEXT,
    legacy_price_id TEXT,
    action TEXT NOT NULL,
    active_for_price_ranking INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    raw_json TEXT,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_rules (
    rule_id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    branch_id TEXT,
    applies_to_category TEXT NOT NULL DEFAULT 'all',
    currency TEXT NOT NULL,
    fixed_delivery_fee TEXT,
    free_delivery_threshold TEXT,
    per_km_rate TEXT,
    per_mile_rate TEXT,
    truck_capacity_m3 TEXT DEFAULT '8.0',
    min_load_m3 TEXT DEFAULT '0',
    small_load_fee TEXT,
    underload_fee_per_m3 TEXT,
    pump_fixed_fee TEXT,
    pump_per_m3_fee TEXT,
    max_radius_km REAL,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS benchmark_references (
    benchmark_id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    source_ids_json TEXT NOT NULL,
    product_name TEXT NOT NULL,
    amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    unit TEXT NOT NULL,
    record_type TEXT NOT NULL,
    period TEXT,
    observed_at TEXT,
    eligible_for_cheapest INTEGER NOT NULL DEFAULT 0,
    eligible_for_production_benchmark INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    branch_id TEXT,
    reviewer_user_id TEXT NOT NULL,
    reviewer_display_name TEXT NOT NULL,
    order_reference TEXT NOT NULL,
    verified_purchase INTEGER NOT NULL DEFAULT 0,
    service_rating INTEGER NOT NULL CHECK(service_rating BETWEEN 1 AND 5),
    material_rating INTEGER NOT NULL CHECK(material_rating BETWEEN 1 AND 5),
    overall_rating REAL NOT NULL,
    title TEXT,
    review_text TEXT NOT NULL,
    moderation_state TEXT NOT NULL DEFAULT 'pending',
    moderation_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(supplier_id, reviewer_user_id, order_reference),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS staged_imports (
    batch_id TEXT PRIMARY KEY,
    source_package TEXT NOT NULL,
    status TEXT NOT NULL,
    summary_json TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL,
    approved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL
);
"""

_MIGRATION_COLUMNS: Dict[str, List[Tuple[str, str]]] = {
    "countries": [
        ("market_refresh_status", "TEXT DEFAULT 'locality_and_prior_lead_fallback_not_part_of_50_market_refresh'"),
        ("locales_json", "TEXT DEFAULT '[]'"),
        ("location_suggestion_count", "INTEGER DEFAULT 0"),
        ("supplier_or_network_records", "INTEGER DEFAULT 0"),
        ("external_discovery_records", "INTEGER DEFAULT 0"),
        ("branch_or_contact_locations", "INTEGER DEFAULT 0"),
        ("retail_or_distributor_locations", "INTEGER DEFAULT 0"),
        ("external_retail_directory_branches", "INTEGER DEFAULT 0"),
        ("single_numeric_price_observations", "INTEGER DEFAULT 0"),
        ("price_range_observations", "INTEGER DEFAULT 0"),
        ("availability_observations", "INTEGER DEFAULT 0"),
        ("external_catalog_observations", "INTEGER DEFAULT 0"),
        ("physical_branch_coordinates", "INTEGER DEFAULT 0"),
        ("published_price_coverage", "INTEGER DEFAULT 0"),
        ("requires_quote_for_numeric_pricing", "INTEGER DEFAULT 1"),
        ("verified_review_sets", "INTEGER DEFAULT 0"),
        ("discovery_source_urls_json", "TEXT DEFAULT '[]'"),
    ],
    "suppliers": [
        ("source_urls_json", "TEXT DEFAULT '[]'"),
        ("source_checked_at", "TEXT"),
        ("merchant_confirmed_at", "TEXT"),
        ("delivery_area_confirmed", "TEXT"),
        ("website_or_directory_url", "TEXT"),
        ("stock_status", "TEXT DEFAULT 'unknown'"),
        ("stock_confirmed_at", "TEXT"),
        ("discovery_scope", "TEXT"),
        ("recommendation_eligible", "INTEGER NOT NULL DEFAULT 1"),
        ("brand", "TEXT"),
        ("city", "TEXT"),
        ("address_text", "TEXT"),
        ("phone_e164", "TEXT"),
        ("aliased_to_supplier_id", "TEXT"),
        ("data_origin", "TEXT DEFAULT 'legacy_seed'"),
    ],
    "branches": [
        ("display_name", "TEXT"),
        ("address_text", "TEXT"),
        ("phone_e164", "TEXT"),
        ("location_role", "TEXT DEFAULT 'retail_branch'"),
        ("retail_access_claimed", "INTEGER DEFAULT 1"),
        ("source_ids_json", "TEXT DEFAULT '[]'"),
        ("source_urls_json", "TEXT DEFAULT '[]'"),
        ("source_checked_at", "TEXT"),
        ("merchant_confirmed_at", "TEXT"),
        ("coordinate_kind", "TEXT"),
        ("coordinate_source", "TEXT"),
        ("geocode_status", "TEXT DEFAULT 'not_geocoded'"),
        ("eligible_for_nearest", "INTEGER DEFAULT 0"),
        ("stock_status", "TEXT DEFAULT 'unknown'"),
        ("stock_quantity", "INTEGER"),
        ("stock_confirmed_at", "TEXT"),
        ("delivery_area_confirmed", "TEXT"),
        ("customer_rating", "REAL"),
        ("review_count", "INTEGER DEFAULT 0"),
        ("brand", "TEXT"),
        ("product_categories_json", "TEXT DEFAULT '[]'"),
        ("notes", "TEXT"),
        ("data_origin", "TEXT DEFAULT 'global_market_50'"),
    ],
    "price_snapshots": [
        ("amount_numeric", "REAL"),
        ("amount_min", "REAL"),
        ("amount_max", "REAL"),
        ("sku", "TEXT"),
        ("source_grade", "TEXT"),
        ("source_url", "TEXT"),
        ("source_effective_at", "TEXT"),
        ("evidence_status", "TEXT DEFAULT 'unconfirmed_publication_snapshot'"),
        ("price_kind", "TEXT DEFAULT 'public_catalog_snapshot'"),
        ("delivery_fee", "TEXT"),
        ("handling_fee", "TEXT"),
        ("delivery_area_confirmed", "TEXT"),
        ("stock_confirmed_at", "TEXT"),
        ("quantity_min", "INTEGER"),
        ("quantity_max", "INTEGER"),
        ("customer_tier", "TEXT DEFAULT 'unspecified'"),
        ("payment_condition", "TEXT"),
        ("product_origin_country", "TEXT"),
        ("air_entrainment", "TEXT"),
        ("intended_use_claim", "TEXT"),
        ("service_area_claim", "TEXT"),
        ("location_context", "TEXT"),
        ("delivery_included_claim", "TEXT"),
        ("normalized_amount_per_kg", "REAL"),
        ("normalized_amount_per_m3", "REAL"),
        ("normalization_scope", "TEXT"),
        ("display_caveat", "TEXT"),
        ("eligible_for_cheapest_delivered", "INTEGER DEFAULT 0"),
        ("data_origin", "TEXT DEFAULT 'legacy_seed'"),
    ],
}


def _apply_column_migrations(conn: sqlite3.Connection) -> None:
    """Ensure existing SQLite databases gain all 50-country refresh columns safely."""
    for table_name, cols in _MIGRATION_COLUMNS.items():
        existing_info = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        existing_names = {r["name"] for r in existing_info}
        for col_name, col_def in cols:
            if col_name not in existing_names:
                conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}")

    # Also check if branches.supplier_id has NOT NULL constraint in an older empty table;
    # if so and branches is empty, recreate branches without NOT NULL on supplier_id.
    br_info = conn.execute("PRAGMA table_info(branches)").fetchall()
    sup_col = next((r for r in br_info if r["name"] == "supplier_id"), None)
    if sup_col and sup_col["notnull"] == 1:
        br_cnt = conn.execute("SELECT COUNT(*) FROM branches").fetchone()[0]
        if br_cnt == 0:
            conn.execute("DROP TABLE branches")
            conn.executescript(SCHEMA_SQL)


def init_market_db(db_path: Optional[Path] = None) -> None:
    conn = get_connection(db_path)
    try:
        conn.executescript(SCHEMA_SQL)
        _apply_column_migrations(conn)
        conn.commit()
    finally:
        conn.close()


def log_audit_event(
    conn: sqlite3.Connection,
    actor: str,
    role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Optional[Dict[str, Any]] = None,
) -> str:
    log_id = f"aud_{uuid.uuid4().hex[:12]}"
    conn.execute(
        """
        INSERT INTO audit_logs (log_id, actor, role, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            log_id,
            actor,
            role,
            action,
            entity_type,
            entity_id,
            json.dumps(details or {}, ensure_ascii=False),
            _utc_now_iso(),
        ),
    )
    return log_id


def stage_research_pack(
    research_dir: Optional[Path] = None,
    db_path: Optional[Path] = None,
    actor: str = "system_importer",
) -> Dict[str, Any]:
    """
    Read market_seed.json, sources.json, and input_bounds_reference.json,
    validate and deduplicate records, and insert a staged import batch
    ready for review and approval.
    """
    init_market_db(db_path)
    pack_dir = research_dir or get_research_pack_dir()
    market_seed_path = pack_dir / "market_seed.json"
    sources_path = pack_dir / "sources.json"
    bounds_path = pack_dir / "input_bounds_reference.json"

    if not market_seed_path.exists():
        raise FileNotFoundError(f"Missing market_seed.json at {market_seed_path}")
    if not sources_path.exists():
        raise FileNotFoundError(f"Missing sources.json at {sources_path}")
    if not bounds_path.exists():
        raise FileNotFoundError(f"Missing input_bounds_reference.json at {bounds_path}")

    with open(market_seed_path, "r", encoding="utf-8") as f:
        market_seed = json.load(f)
    with open(sources_path, "r", encoding="utf-8") as f:
        sources_list = json.load(f)
    with open(bounds_path, "r", encoding="utf-8") as f:
        bounds_ref = json.load(f)

    sources_by_id: Dict[str, Dict[str, Any]] = {}
    duplicate_sources = 0
    for src in sources_list:
        sid = src["source_id"]
        if sid in sources_by_id:
            duplicate_sources += 1
        sources_by_id[sid] = src

    countries_by_code: Dict[str, Dict[str, Any]] = {}
    for c in market_seed.get("countries", []):
        countries_by_code[c["country_code"].upper()] = c

    suppliers_by_id: Dict[str, Dict[str, Any]] = {}
    duplicate_suppliers = 0
    missing_source_refs: List[str] = []
    for sup in market_seed.get("suppliers", []):
        sup_id = sup["supplier_id"]
        if sup_id in suppliers_by_id:
            duplicate_suppliers += 1
        for sid in sup.get("source_ids", []):
            if sid not in sources_by_id:
                missing_source_refs.append(f"supplier:{sup_id}->source:{sid}")
        suppliers_by_id[sup_id] = sup

    prices_by_id: Dict[str, Dict[str, Any]] = {}
    duplicate_prices = 0
    for p in market_seed.get("price_snapshots", []):
        pid = p["price_id"]
        if pid in prices_by_id:
            duplicate_prices += 1
        for sid in p.get("source_ids", []):
            if sid not in sources_by_id:
                missing_source_refs.append(f"price:{pid}->source:{sid}")
        prices_by_id[pid] = p

    benchmarks_by_id: Dict[str, Dict[str, Any]] = {}
    for b in market_seed.get("benchmark_references", []):
        bid = b["benchmark_id"]
        benchmarks_by_id[bid] = b

    branches = market_seed.get("branches", [])
    reviews = market_seed.get("reviews", [])

    summary = {
        "schema_version": market_seed.get("schema_version", "1.0.0"),
        "researched_at": market_seed.get("researched_at"),
        "countries_staged": len(countries_by_code),
        "sources_staged": len(sources_by_id),
        "suppliers_staged": len(suppliers_by_id),
        "price_snapshots_staged": len(prices_by_id),
        "benchmark_references_staged": len(benchmarks_by_id),
        "branches_staged": len(branches),
        "reviews_staged": len(reviews),
        "duplicate_sources_skipped": duplicate_sources,
        "duplicate_suppliers_skipped": duplicate_suppliers,
        "duplicate_prices_skipped": duplicate_prices,
        "missing_source_references": missing_source_refs,
        "bounds_reference_features": len(bounds_ref.get("features", {})),
        "import_rules_enforced": market_seed.get("import_rules", []),
    }

    batch_id = f"stg_{uuid.uuid4().hex[:12]}"
    payload = {
        "countries": list(countries_by_code.values()),
        "sources": list(sources_by_id.values()),
        "suppliers": list(suppliers_by_id.values()),
        "price_snapshots": list(prices_by_id.values()),
        "benchmark_references": list(benchmarks_by_id.values()),
        "branches": branches,
        "reviews": reviews,
    }

    conn = get_connection(db_path)
    try:
        conn.execute(
            """
            INSERT INTO staged_imports (
                batch_id, source_package, status, summary_json, payload_json, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                batch_id,
                str(pack_dir),
                "staged_pending_approval",
                json.dumps(summary, ensure_ascii=False),
                json.dumps(payload, ensure_ascii=False),
                actor,
                _utc_now_iso(),
            ),
        )
        log_audit_event(
            conn=conn,
            actor=actor,
            role="admin",
            action="stage_research_pack",
            entity_type="staged_import",
            entity_id=batch_id,
            details=summary,
        )
        conn.commit()
    finally:
        conn.close()

    return {"batch_id": batch_id, "status": "staged_pending_approval", "summary": summary}


def approve_staged_import(
    batch_id: str,
    db_path: Optional[Path] = None,
    approver: str = "system_admin",
) -> Dict[str, Any]:
    """
    Approve and commit a staged import batch into the active database tables.
    """
    init_market_db(db_path)
    conn = get_connection(db_path)
    now = _utc_now_iso()
    try:
        row = conn.execute(
            "SELECT * FROM staged_imports WHERE batch_id = ?", (batch_id,)
        ).fetchone()
        if not row:
            raise ValueError(f"Staged import batch '{batch_id}' not found.")

        payload = json.loads(row["payload_json"])
        summary = json.loads(row["summary_json"])

        for c in payload.get("countries", []):
            conn.execute(
                """
                INSERT INTO countries (
                    country_code, country_name, display_currency, coverage_status,
                    price_snapshot_count, benchmark_reference_count,
                    live_inventory_connected, live_supplier_quote_count,
                    country_price_average, source_observed_at, notes, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(country_code) DO UPDATE SET
                    country_name=excluded.country_name,
                    display_currency=excluded.display_currency,
                    coverage_status=excluded.coverage_status,
                    price_snapshot_count=excluded.price_snapshot_count,
                    benchmark_reference_count=excluded.benchmark_reference_count,
                    live_inventory_connected=excluded.live_inventory_connected,
                    live_supplier_quote_count=excluded.live_supplier_quote_count,
                    country_price_average=excluded.country_price_average,
                    source_observed_at=excluded.source_observed_at,
                    notes=excluded.notes,
                    updated_at=excluded.updated_at
                """,
                (
                    c["country_code"].upper(),
                    c["country_name"],
                    c.get("display_currency", "USD"),
                    c.get("coverage_status", "supplier_leads_only"),
                    int(c.get("price_snapshot_count", 0)),
                    int(c.get("benchmark_reference_count", 0)),
                    1 if c.get("live_inventory_connected") else 0,
                    int(c.get("live_supplier_quote_count", 0)),
                    c.get("country_price_average"),
                    c.get("source_observed_at"),
                    c.get("notes"),
                    now,
                ),
            )

        for s in payload.get("sources", []):
            conn.execute(
                """
                INSERT INTO sources (
                    source_id, title, url, source_type, observed_at,
                    observation_method, evidence_summary, raw_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    title=excluded.title,
                    url=excluded.url,
                    source_type=excluded.source_type,
                    observed_at=excluded.observed_at,
                    observation_method=excluded.observation_method,
                    evidence_summary=excluded.evidence_summary,
                    raw_json=excluded.raw_json,
                    updated_at=excluded.updated_at
                """,
                (
                    s["source_id"],
                    s.get("title", s["source_id"]),
                    s.get("url", ""),
                    s.get("source_type", "public_web_research"),
                    s.get("observed_at"),
                    s.get("observation_method"),
                    s.get("evidence_summary"),
                    json.dumps(s, ensure_ascii=False),
                    now,
                ),
            )

        for sup in payload.get("suppliers", []):
            conn.execute(
                """
                INSERT INTO suppliers (
                    supplier_id, country_code, display_name, record_type,
                    source_ids_json, source_url, product_categories_json,
                    branch_id, latitude, longitude, delivery_area,
                    online_stock, customer_rating, review_count,
                    supplier_confirmed_at, commercial_status,
                    eligible_for_nearest, eligible_for_cheapest,
                    shared_pricing_notes, notes, is_active, updated_at, data_origin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'legacy_seed')
                ON CONFLICT(supplier_id) DO UPDATE SET
                    country_code=excluded.country_code,
                    display_name=excluded.display_name,
                    record_type=excluded.record_type,
                    source_ids_json=excluded.source_ids_json,
                    source_url=excluded.source_url,
                    product_categories_json=excluded.product_categories_json,
                    branch_id=excluded.branch_id,
                    latitude=excluded.latitude,
                    longitude=excluded.longitude,
                    delivery_area=excluded.delivery_area,
                    online_stock=excluded.online_stock,
                    customer_rating=excluded.customer_rating,
                    review_count=excluded.review_count,
                    supplier_confirmed_at=excluded.supplier_confirmed_at,
                    commercial_status=excluded.commercial_status,
                    eligible_for_nearest=excluded.eligible_for_nearest,
                    eligible_for_cheapest=excluded.eligible_for_cheapest,
                    shared_pricing_notes=excluded.shared_pricing_notes,
                    notes=excluded.notes,
                    updated_at=excluded.updated_at
                """,
                (
                    sup["supplier_id"],
                    sup["country_code"].upper(),
                    sup["display_name"],
                    sup.get("record_type", "manufacturer_country_lead"),
                    json.dumps(sup.get("source_ids", []), ensure_ascii=False),
                    sup.get("source_url"),
                    json.dumps(sup.get("product_categories_confirmed", []), ensure_ascii=False),
                    sup.get("branch_id"),
                    sup.get("latitude"),
                    sup.get("longitude"),
                    sup.get("delivery_area"),
                    sup.get("online_stock"),
                    sup.get("customer_rating"),
                    int(sup.get("review_count", 0)),
                    sup.get("supplier_confirmed_at"),
                    sup.get("commercial_status", "requires_local_confirmation"),
                    1 if sup.get("eligible_for_nearest") else 0,
                    1 if sup.get("eligible_for_cheapest") else 0,
                    json.dumps(sup.get("shared_pricing_notes"), ensure_ascii=False)
                    if sup.get("shared_pricing_notes") is not None
                    else None,
                    sup.get("notes", ""),
                    now,
                ),
            )

        for p in payload.get("price_snapshots", []):
            norm = p.get("normalized_price") or {}
            tax_inc = p.get("tax_included")
            tax_inc_db = None if tax_inc is None else (1 if tax_inc else 0)
            amt_num = None
            try:
                amt_num = float(p["original_amount"])
            except (TypeError, ValueError):
                amt_num = None
            conn.execute(
                """
                INSERT INTO price_snapshots (
                    price_id, country_code, supplier_id, branch_id,
                    source_ids_json, product_name, product_category,
                    specification_json, original_amount, original_currency,
                    original_unit, pack_mass_kg, bulk_density_kg_per_m3,
                    normalized_value, normalized_currency, normalized_unit,
                    published_gross_amount, tax_included, vat_rate_pct,
                    delivery_inclusion, effective_from, valid_until,
                    observed_at, supplier_confirmed_at, price_status,
                    is_live, eligible_for_cheapest, eligible_for_production_benchmark,
                    grade_mapping_status, stock_status, min_order_qty, min_order_fee,
                    notes, is_active, updated_at, amount_numeric, data_origin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'legacy_seed')
                ON CONFLICT(price_id) DO UPDATE SET
                    country_code=excluded.country_code,
                    supplier_id=excluded.supplier_id,
                    source_ids_json=excluded.source_ids_json,
                    product_name=excluded.product_name,
                    product_category=excluded.product_category,
                    specification_json=excluded.specification_json,
                    original_amount=excluded.original_amount,
                    original_currency=excluded.original_currency,
                    original_unit=excluded.original_unit,
                    pack_mass_kg=excluded.pack_mass_kg,
                    normalized_value=excluded.normalized_value,
                    normalized_currency=excluded.normalized_currency,
                    normalized_unit=excluded.normalized_unit,
                    published_gross_amount=excluded.published_gross_amount,
                    tax_included=excluded.tax_included,
                    delivery_inclusion=excluded.delivery_inclusion,
                    effective_from=excluded.effective_from,
                    valid_until=excluded.valid_until,
                    observed_at=excluded.observed_at,
                    supplier_confirmed_at=excluded.supplier_confirmed_at,
                    price_status=excluded.price_status,
                    is_live=excluded.is_live,
                    eligible_for_cheapest=excluded.eligible_for_cheapest,
                    eligible_for_production_benchmark=excluded.eligible_for_production_benchmark,
                    grade_mapping_status=excluded.grade_mapping_status,
                    notes=excluded.notes,
                    updated_at=excluded.updated_at,
                    amount_numeric=excluded.amount_numeric
                """,
                (
                    p["price_id"],
                    p["country_code"].upper(),
                    p["supplier_id"],
                    p.get("branch_id"),
                    json.dumps(p.get("source_ids", []), ensure_ascii=False),
                    p["product_name"],
                    p["product_category"],
                    json.dumps(p.get("specification", {}), ensure_ascii=False),
                    str(p["original_amount"]),
                    p["original_currency"].upper(),
                    p.get("original_unit"),
                    float(p["pack_mass_kg"]) if p.get("pack_mass_kg") is not None else None,
                    float(p["bulk_density_kg_per_m3"]) if p.get("bulk_density_kg_per_m3") is not None else None,
                    str(norm["value"]) if norm.get("value") is not None else None,
                    norm.get("currency"),
                    norm.get("unit"),
                    str(p["published_gross_amount"]) if p.get("published_gross_amount") is not None else None,
                    tax_inc_db,
                    str(p["vat_rate_pct"]) if p.get("vat_rate_pct") is not None else None,
                    p.get("delivery_inclusion", "unknown"),
                    p.get("effective_from"),
                    p.get("valid_until"),
                    p.get("observed_at"),
                    p.get("supplier_confirmed_at"),
                    p.get("price_status", "published_snapshot_unconfirmed"),
                    1 if p.get("is_live") else 0,
                    1 if p.get("eligible_for_cheapest") else 0,
                    1 if p.get("eligible_for_production_benchmark") else 0,
                    p.get("grade_mapping_status"),
                    p.get("stock_status"),
                    str(p["min_order_qty"]) if p.get("min_order_qty") is not None else None,
                    str(p["min_order_fee"]) if p.get("min_order_fee") is not None else None,
                    p.get("notes", ""),
                    now,
                    amt_num,
                ),
            )

        for b in payload.get("benchmark_references", []):
            conn.execute(
                """
                INSERT INTO benchmark_references (
                    benchmark_id, country_code, source_ids_json, product_name,
                    amount, currency, unit, record_type, period, observed_at,
                    eligible_for_cheapest, eligible_for_production_benchmark,
                    notes, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(benchmark_id) DO UPDATE SET
                    country_code=excluded.country_code,
                    source_ids_json=excluded.source_ids_json,
                    product_name=excluded.product_name,
                    amount=excluded.amount,
                    currency=excluded.currency,
                    unit=excluded.unit,
                    record_type=excluded.record_type,
                    period=excluded.period,
                    observed_at=excluded.observed_at,
                    eligible_for_cheapest=excluded.eligible_for_cheapest,
                    eligible_for_production_benchmark=excluded.eligible_for_production_benchmark,
                    notes=excluded.notes,
                    updated_at=excluded.updated_at
                """,
                (
                    b["benchmark_id"],
                    b["country_code"].upper(),
                    json.dumps(b.get("source_ids", []), ensure_ascii=False),
                    b["product_name"],
                    str(b["amount"]),
                    b["currency"].upper(),
                    b["unit"],
                    b.get("record_type", "government_cost_schedule_not_supplier_offer"),
                    b.get("period"),
                    b.get("observed_at"),
                    1 if b.get("eligible_for_cheapest") else 0,
                    1 if b.get("eligible_for_production_benchmark") else 0,
                    b.get("notes", ""),
                    now,
                ),
            )

        conn.execute(
            """
            UPDATE staged_imports
            SET status = 'approved_committed', approved_by = ?, approved_at = ?
            WHERE batch_id = ?
            """,
            (approver, now, batch_id),
        )
        log_audit_event(
            conn=conn,
            actor=approver,
            role="admin",
            action="approve_staged_import",
            entity_type="staged_import",
            entity_id=batch_id,
            details=summary,
        )
        conn.commit()
        return {"batch_id": batch_id, "status": "approved_committed", "summary": summary}
    finally:
        conn.close()


def _normalize_pack_unit(raw_unit: Optional[str]) -> Optional[str]:
    if raw_unit is None:
        return None
    u = str(raw_unit).strip()
    if u in ("50_kg_bag", "25_kg_bag", "40_kg_bag", "20_kg_bag"):
        return "bag"
    return u


def _normalize_category_code(raw_cat: str) -> str:
    c = (raw_cat or "cement").strip().lower()
    if c == "dry_concrete_mix":
        return "dry_concrete"
    if c == "admixture":
        return "admixtures"
    return c


def import_50_country_refresh(
    pack_dir: Optional[Path] = None,
    db_path: Optional[Path] = None,
    actor: str = "system_50_country_importer",
) -> Dict[str, Any]:
    """
    Idempotently import the 50-country research package (`global_market_50.json`,
    `cameroon_market_supplement.json` imported once, `sources_50.json`,
    `research_sources.json`, `country_discovery_manifest.json`, and
    `data_quality_actions.json`), while preserving legitimate prior records
    outside the 50 refreshed countries and retaining historical price observations.
    """
    init_market_db(db_path)
    p_dir = pack_dir or get_research_pack_50_dir()

    global_path = p_dir / "global_market_50.json"
    cm_path = p_dir / "cameroon_market_supplement.json"
    sources_50_path = p_dir / "sources_50.json"
    research_sources_path = p_dir / "research_sources.json"
    manifest_path = p_dir / "country_discovery_manifest.json"
    dq_path = p_dir / "data_quality_actions.json"

    for req_file in (global_path, cm_path, sources_50_path, research_sources_path, manifest_path, dq_path):
        if not req_file.exists():
            raise FileNotFoundError(f"Required 50-country research file missing: {req_file}")

    global_data = json.loads(global_path.read_text(encoding="utf-8"))
    cm_data = json.loads(cm_path.read_text(encoding="utf-8"))
    sources_50_data = json.loads(sources_50_path.read_text(encoding="utf-8"))
    research_sources_data = json.loads(research_sources_path.read_text(encoding="utf-8"))
    manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
    dq_data = json.loads(dq_path.read_text(encoding="utf-8"))

    refreshed_countries_by_code: Dict[str, Dict[str, Any]] = {
        c["country_code"].upper(): c for c in global_data.get("countries", [])
    }
    refreshed_50_codes = set(refreshed_countries_by_code.keys())

    conn = get_connection(db_path)
    now = _utc_now_iso()
    try:
        # 1. Upsert all 100 countries from country_discovery_manifest.json + global_market_50.json
        for mc in manifest_data.get("countries", []):
            cc = mc["country_code"].upper()
            rc = refreshed_countries_by_code.get(cc)
            is_refreshed_50 = rc is not None
            market_refresh_status = mc.get(
                "market_refresh_status",
                "researched_50_market_refresh"
                if is_refreshed_50
                else "locality_and_prior_lead_fallback_not_part_of_50_market_refresh",
            )
            locales_json = json.dumps(
                (rc.get("locales") if rc else None) or mc.get("locales", []),
                ensure_ascii=False,
            )
            disc_urls_json = json.dumps(mc.get("discovery_source_urls", []), ensure_ascii=False)
            loc_count = int(
                (rc.get("city_town_suggestions") if rc else None)
                or mc.get("location_count", 0)
            )

            if rc is not None:
                tot_prices = int(rc.get("price_observations", 0)) + int(
                    rc.get("external_price_observations", 0)
                )
                coverage_status = (
                    "researched_50_with_published_prices"
                    if rc.get("published_price_coverage")
                    else "researched_50_quote_channels_only"
                )
                conn.execute(
                    """
                    INSERT INTO countries (
                        country_code, country_name, display_currency, coverage_status,
                        price_snapshot_count, benchmark_reference_count,
                        live_inventory_connected, live_supplier_quote_count,
                        country_price_average, source_observed_at, notes, updated_at,
                        market_refresh_status, locales_json, location_suggestion_count,
                        supplier_or_network_records, external_discovery_records,
                        branch_or_contact_locations, retail_or_distributor_locations,
                        external_retail_directory_branches, single_numeric_price_observations,
                        price_range_observations, availability_observations,
                        external_catalog_observations, physical_branch_coordinates,
                        published_price_coverage, requires_quote_for_numeric_pricing,
                        verified_review_sets, discovery_source_urls_json
                    ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(country_code) DO UPDATE SET
                        country_name=excluded.country_name,
                        display_currency=excluded.display_currency,
                        coverage_status=excluded.coverage_status,
                        price_snapshot_count=excluded.price_snapshot_count,
                        live_inventory_connected=0,
                        live_supplier_quote_count=0,
                        source_observed_at=excluded.source_observed_at,
                        notes=excluded.notes,
                        updated_at=excluded.updated_at,
                        market_refresh_status=excluded.market_refresh_status,
                        locales_json=excluded.locales_json,
                        location_suggestion_count=excluded.location_suggestion_count,
                        supplier_or_network_records=excluded.supplier_or_network_records,
                        external_discovery_records=excluded.external_discovery_records,
                        branch_or_contact_locations=excluded.branch_or_contact_locations,
                        retail_or_distributor_locations=excluded.retail_or_distributor_locations,
                        external_retail_directory_branches=excluded.external_retail_directory_branches,
                        single_numeric_price_observations=excluded.single_numeric_price_observations,
                        price_range_observations=excluded.price_range_observations,
                        availability_observations=excluded.availability_observations,
                        external_catalog_observations=excluded.external_catalog_observations,
                        physical_branch_coordinates=excluded.physical_branch_coordinates,
                        published_price_coverage=excluded.published_price_coverage,
                        requires_quote_for_numeric_pricing=excluded.requires_quote_for_numeric_pricing,
                        verified_review_sets=excluded.verified_review_sets,
                        discovery_source_urls_json=excluded.discovery_source_urls_json
                    """,
                    (
                        cc,
                        rc["country_name"],
                        rc.get("currency", mc.get("currency", "USD")),
                        coverage_status,
                        tot_prices,
                        global_data.get("checked_at", "2026-10-18"),
                        mc.get("notes"),
                        now,
                        market_refresh_status,
                        locales_json,
                        loc_count,
                        int(rc.get("supplier_or_network_records", 0)),
                        int(rc.get("external_discovery_records", 0)),
                        int(rc.get("branch_or_contact_locations", 0)),
                        int(rc.get("retail_or_distributor_locations", 0)),
                        int(rc.get("external_retail_directory_branches", 0)),
                        int(rc.get("single_numeric_price_observations", 0)),
                        int(rc.get("price_range_observations", 0)),
                        int(rc.get("availability_observations", 0)),
                        int(rc.get("external_catalog_observations", 0)),
                        int(rc.get("physical_branch_coordinates", 0)),
                        1 if rc.get("published_price_coverage") else 0,
                        1 if rc.get("requires_quote_for_numeric_pricing") else 0,
                        int(rc.get("verified_review_sets", 0)),
                        disc_urls_json,
                    ),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO countries (
                        country_code, country_name, display_currency, coverage_status,
                        price_snapshot_count, benchmark_reference_count,
                        live_inventory_connected, live_supplier_quote_count,
                        country_price_average, source_observed_at, notes, updated_at,
                        market_refresh_status, locales_json, location_suggestion_count,
                        discovery_source_urls_json
                    ) VALUES (?, ?, ?, 'prior_lead_and_locality_fallback', 0, 0, 0, 0, NULL, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(country_code) DO UPDATE SET
                        country_name=excluded.country_name,
                        display_currency=excluded.display_currency,
                        market_refresh_status=excluded.market_refresh_status,
                        locales_json=excluded.locales_json,
                        location_suggestion_count=excluded.location_suggestion_count,
                        discovery_source_urls_json=excluded.discovery_source_urls_json,
                        updated_at=excluded.updated_at
                    """,
                    (
                        cc,
                        mc["country_name"],
                        mc.get("currency", "USD"),
                        manifest_data.get("checked_at", "2026-10-18"),
                        mc.get("notes"),
                        now,
                        market_refresh_status,
                        locales_json,
                        loc_count,
                        disc_urls_json,
                    ),
                )

        # 2. Upsert sources from sources_50.json (217 sources) and research_sources.json (16 CM sources)
        for s in sources_50_data.get("sources", []):
            conn.execute(
                """
                INSERT INTO sources (
                    source_id, title, url, source_type, observed_at,
                    observation_method, evidence_summary, raw_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    title=excluded.title,
                    url=excluded.url,
                    source_type=excluded.source_type,
                    observed_at=excluded.observed_at,
                    observation_method=excluded.observation_method,
                    evidence_summary=excluded.evidence_summary,
                    raw_json=excluded.raw_json,
                    updated_at=excluded.updated_at
                """,
                (
                    s["source_id"],
                    s.get("title") or s["source_id"],
                    s.get("url") or "",
                    s.get("evidence_type") or "public_web_research",
                    s.get("checked_at") or "2026-10-18",
                    s.get("access_method") or "public_web_research",
                    s.get("freshness_note"),
                    json.dumps(s, ensure_ascii=False),
                    now,
                ),
            )

        for rs in research_sources_data:
            conn.execute(
                """
                INSERT INTO sources (
                    source_id, title, url, source_type, observed_at,
                    observation_method, evidence_summary, raw_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    title=excluded.title,
                    url=excluded.url,
                    source_type=excluded.source_type,
                    observed_at=excluded.observed_at,
                    observation_method=excluded.observation_method,
                    evidence_summary=excluded.evidence_summary,
                    raw_json=excluded.raw_json,
                    updated_at=excluded.updated_at
                """,
                (
                    rs["source_id"],
                    rs.get("title") or rs["source_id"],
                    rs.get("url") or "",
                    rs.get("source_type") or "manufacturer_directory",
                    rs.get("retrieved_at") or "2026-10-18",
                    "public_web_research",
                    rs.get("limits"),
                    json.dumps(rs, ensure_ascii=False),
                    now,
                ),
            )

        # 3. Record and apply data_quality_actions.json BEFORE enabling active price ranking
        for dq in dq_data.get("actions", []):
            legacy_pid = dq.get("legacy_record_id") or dq.get("legacy_price_id")
            dq_reason = dq.get("reason") or dq.get("notes") or dq.get("action") or ""
            conn.execute(
                """
                INSERT INTO data_quality_actions (
                    action_id, country_code, supplier_id, legacy_price_id,
                    action, active_for_price_ranking, reason, raw_json, applied_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(action_id) DO UPDATE SET
                    country_code=excluded.country_code,
                    supplier_id=excluded.supplier_id,
                    legacy_price_id=excluded.legacy_price_id,
                    action=excluded.action,
                    active_for_price_ranking=excluded.active_for_price_ranking,
                    reason=excluded.reason,
                    raw_json=excluded.raw_json,
                    applied_at=excluded.applied_at
                """,
                (
                    dq["id"],
                    (dq.get("country_code") or "ALL").upper(),
                    dq.get("supplier_id"),
                    legacy_pid,
                    dq["action"],
                    1 if dq.get("active_for_price_ranking") else 0,
                    dq_reason,
                    json.dumps(dq, ensure_ascii=False),
                    now,
                ),
            )
            if legacy_pid:
                conn.execute(
                    """
                    UPDATE price_snapshots
                    SET is_active = 0,
                        eligible_for_cheapest = 0,
                        eligible_for_cheapest_delivered = 0,
                        price_status = 'quarantined_for_reconfirmation',
                        notes = ?
                    WHERE price_id = ?
                    """,
                    (
                        f"Quarantined ({dq['id']}): {dq_reason}",
                        legacy_pid,
                    ),
                )

        # 4. Mark legacy 2026-10-17 seed rows inside the 50 refreshed countries as historical/aliased
        # while preserving all legitimate records outside the 50 refreshed countries.
        placeholders_50 = ",".join("?" for _ in refreshed_50_codes)
        ordered_50 = sorted(refreshed_50_codes)

        for legacy_id, canonical_id in LEGACY_SUPPLIER_ALIASES.items():
            if legacy_id != canonical_id:
                conn.execute(
                    """
                    UPDATE suppliers
                    SET is_active = 0,
                        aliased_to_supplier_id = ?,
                        updated_at = ?
                    WHERE supplier_id = ? AND data_origin = 'legacy_seed'
                    """,
                    (canonical_id, now, legacy_id),
                )

        conn.execute(
            f"""
            UPDATE suppliers
            SET is_active = 0,
                updated_at = ?
            WHERE country_code IN ({placeholders_50})
              AND data_origin = 'legacy_seed'
              AND supplier_id != 'cm_052'
            """,
            [now, *ordered_50],
        )

        conn.execute(
            f"""
            UPDATE price_snapshots
            SET is_active = 0,
                eligible_for_cheapest = 0,
                eligible_for_cheapest_delivered = 0,
                updated_at = ?
            WHERE country_code IN ({placeholders_50})
              AND data_origin = 'legacy_seed'
            """,
            [now, *ordered_50],
        )

        # 5. Upsert 135 suppliers from global_market_50.json (outside Cameroon)
        for sup in global_data.get("suppliers", []):
            cats = [_normalize_category_code(c) for c in sup.get("product_categories", [])]
            rec_elig = 1 if sup.get("recommendation_eligible", True) else 0
            comm_status = (
                "manual_review_placeholder_marketplace"
                if not rec_elig
                else "requires_local_confirmation"
            )
            conn.execute(
                """
                INSERT INTO suppliers (
                    supplier_id, country_code, display_name, record_type,
                    source_ids_json, source_url, product_categories_json,
                    branch_id, latitude, longitude, delivery_area,
                    online_stock, customer_rating, review_count,
                    supplier_confirmed_at, commercial_status,
                    eligible_for_nearest, eligible_for_cheapest,
                    shared_pricing_notes, notes, is_active, updated_at,
                    source_urls_json, source_checked_at, merchant_confirmed_at,
                    delivery_area_confirmed, website_or_directory_url,
                    stock_status, stock_confirmed_at, discovery_scope,
                    recommendation_eligible, data_origin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, 0, ?, ?, 0, 0, NULL, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'global_market_50')
                ON CONFLICT(supplier_id) DO UPDATE SET
                    country_code=excluded.country_code,
                    display_name=excluded.display_name,
                    record_type=excluded.record_type,
                    source_ids_json=excluded.source_ids_json,
                    source_url=excluded.source_url,
                    product_categories_json=excluded.product_categories_json,
                    delivery_area=excluded.delivery_area,
                    online_stock=excluded.online_stock,
                    customer_rating=NULL,
                    review_count=0,
                    supplier_confirmed_at=excluded.supplier_confirmed_at,
                    commercial_status=excluded.commercial_status,
                    eligible_for_nearest=0,
                    eligible_for_cheapest=0,
                    notes=excluded.notes,
                    is_active=1,
                    updated_at=excluded.updated_at,
                    source_urls_json=excluded.source_urls_json,
                    source_checked_at=excluded.source_checked_at,
                    merchant_confirmed_at=excluded.merchant_confirmed_at,
                    delivery_area_confirmed=excluded.delivery_area_confirmed,
                    website_or_directory_url=excluded.website_or_directory_url,
                    stock_status=excluded.stock_status,
                    stock_confirmed_at=excluded.stock_confirmed_at,
                    discovery_scope=excluded.discovery_scope,
                    recommendation_eligible=excluded.recommendation_eligible,
                    data_origin='global_market_50'
                """,
                (
                    sup["supplier_id"],
                    sup["country_code"].upper(),
                    sup["display_name"],
                    sup.get("record_type", "retailer"),
                    json.dumps(sup.get("source_ids", []), ensure_ascii=False),
                    sup.get("website_or_directory_url")
                    or (sup.get("source_urls") or [None])[0],
                    json.dumps(cats, ensure_ascii=False),
                    sup.get("delivery_area_confirmed"),
                    sup.get("stock_status", "unknown"),
                    sup.get("merchant_confirmed_at"),
                    comm_status,
                    sup.get("notes", ""),
                    now,
                    json.dumps(sup.get("source_urls", []), ensure_ascii=False),
                    sup.get("source_checked_at"),
                    sup.get("merchant_confirmed_at"),
                    sup.get("delivery_area_confirmed"),
                    sup.get("website_or_directory_url"),
                    sup.get("stock_status", "unknown"),
                    sup.get("stock_confirmed_at"),
                    sup.get("discovery_scope"),
                    rec_elig,
                ),
            )

        # 6. Upsert 3,451 branch/contact locations from global_market_50.json
        for br in global_data.get("branches", []):
            s_ids = br.get("source_ids") or []
            s_urls = br.get("source_urls") or []
            br_cats = [_normalize_category_code(c) for c in br.get("product_categories", [])]
            conn.execute(
                """
                INSERT INTO branches (
                    branch_id, supplier_id, country_code, branch_name,
                    city, address, latitude, longitude, dispatch_radius_km,
                    phone, email, opening_hours, verified_status, source_id,
                    is_active, updated_at, display_name, address_text,
                    phone_e164, location_role, retail_access_claimed,
                    source_ids_json, source_urls_json, source_checked_at,
                    merchant_confirmed_at, coordinate_kind, coordinate_source,
                    geocode_status, eligible_for_nearest, stock_status,
                    stock_quantity, stock_confirmed_at, delivery_area_confirmed,
                    customer_rating, review_count, brand, product_categories_json, notes, data_origin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, 'global_market_50')
                ON CONFLICT(branch_id) DO UPDATE SET
                    supplier_id=excluded.supplier_id,
                    country_code=excluded.country_code,
                    branch_name=excluded.branch_name,
                    city=excluded.city,
                    address=excluded.address,
                    latitude=excluded.latitude,
                    longitude=excluded.longitude,
                    phone=excluded.phone,
                    opening_hours=excluded.opening_hours,
                    verified_status=excluded.verified_status,
                    source_id=excluded.source_id,
                    is_active=1,
                    updated_at=excluded.updated_at,
                    display_name=excluded.display_name,
                    address_text=excluded.address_text,
                    phone_e164=excluded.phone_e164,
                    location_role=excluded.location_role,
                    retail_access_claimed=excluded.retail_access_claimed,
                    source_ids_json=excluded.source_ids_json,
                    source_urls_json=excluded.source_urls_json,
                    source_checked_at=excluded.source_checked_at,
                    merchant_confirmed_at=excluded.merchant_confirmed_at,
                    coordinate_kind=excluded.coordinate_kind,
                    coordinate_source=excluded.coordinate_source,
                    geocode_status=excluded.geocode_status,
                    eligible_for_nearest=excluded.eligible_for_nearest,
                    stock_status=excluded.stock_status,
                    stock_quantity=excluded.stock_quantity,
                    stock_confirmed_at=excluded.stock_confirmed_at,
                    delivery_area_confirmed=excluded.delivery_area_confirmed,
                    brand=excluded.brand,
                    product_categories_json=excluded.product_categories_json,
                    notes=excluded.notes,
                    data_origin='global_market_50'
                """,
                (
                    br["branch_id"],
                    br.get("supplier_id"),
                    br["country_code"].upper(),
                    br["display_name"],
                    br.get("city"),
                    br.get("address_text"),
                    br.get("latitude"),
                    br.get("longitude"),
                    br.get("phone_e164"),
                    json.dumps(br["opening_hours"], ensure_ascii=False)
                    if isinstance(br.get("opening_hours"), (dict, list))
                    else br.get("opening_hours"),
                    br.get("geocode_status", "not_geocoded"),
                    s_ids[0] if s_ids else None,
                    now,
                    br["display_name"],
                    br.get("address_text"),
                    br.get("phone_e164"),
                    br.get("location_role", "retail_branch"),
                    1 if br.get("retail_access_claimed") else 0,
                    json.dumps(s_ids, ensure_ascii=False),
                    json.dumps(s_urls, ensure_ascii=False),
                    br.get("source_checked_at"),
                    br.get("merchant_confirmed_at"),
                    br.get("coordinate_kind"),
                    br.get("coordinate_source"),
                    br.get("geocode_status", "not_geocoded"),
                    1 if br.get("eligible_for_nearest") else 0,
                    br.get("stock_status", "unknown"),
                    br.get("stock_quantity"),
                    br.get("stock_confirmed_at"),
                    br.get("delivery_area_confirmed"),
                    br.get("brand"),
                    json.dumps(br_cats, ensure_ascii=False),
                    br.get("notes", ""),
                ),
            )

        # 7. Import Cameroon supplement ONCE (`cameroon_market_supplement.json`):
        #    - 40 discovery records into `cameroon_discovery_records`
        #    - 7 non-branch supplier/manufacturer/vendor records into `suppliers` (merging `cm_052` Cimencam)
        #    - 33 `retail_directory_branch` records into `branches` (NOT counted as 40 parent companies)
        for rec in cm_data.get("records", []):
            rec_id = rec["record_id"]
            rec_type = rec["record_type"]
            cats = [_normalize_category_code(c) for c in rec.get("product_categories", ["cement"])]
            s_ids = rec.get("source_ids") or []
            s_urls = rec.get("source_urls") or []
            oh_str = (
                json.dumps(rec["opening_hours_published"], ensure_ascii=False)
                if isinstance(rec.get("opening_hours_published"), (dict, list))
                else rec.get("opening_hours_published")
            )

            conn.execute(
                """
                INSERT INTO cameroon_discovery_records (
                    record_id, country_code, display_name, record_type,
                    city, address_text, phone_e164, brand,
                    product_categories_json, category_evidence_scope,
                    source_ids_json, source_urls_json, source_checked_at,
                    merchant_confirmed_at, listing_status, stock_status,
                    stock_confirmed_at, stock_quantity, delivery_area_confirmed,
                    opening_hours_published, latitude, longitude,
                    coordinate_source, geocode_status, eligible_for_nearest,
                    eligible_for_cheapest, customer_rating, review_count,
                    notes, raw_json, updated_at
                ) VALUES (?, 'CM', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
                ON CONFLICT(record_id) DO UPDATE SET
                    display_name=excluded.display_name,
                    record_type=excluded.record_type,
                    city=excluded.city,
                    address_text=excluded.address_text,
                    phone_e164=excluded.phone_e164,
                    brand=excluded.brand,
                    product_categories_json=excluded.product_categories_json,
                    category_evidence_scope=excluded.category_evidence_scope,
                    source_ids_json=excluded.source_ids_json,
                    source_urls_json=excluded.source_urls_json,
                    source_checked_at=excluded.source_checked_at,
                    merchant_confirmed_at=excluded.merchant_confirmed_at,
                    listing_status=excluded.listing_status,
                    stock_status=excluded.stock_status,
                    stock_confirmed_at=excluded.stock_confirmed_at,
                    stock_quantity=excluded.stock_quantity,
                    delivery_area_confirmed=excluded.delivery_area_confirmed,
                    opening_hours_published=excluded.opening_hours_published,
                    latitude=excluded.latitude,
                    longitude=excluded.longitude,
                    coordinate_source=excluded.coordinate_source,
                    geocode_status=excluded.geocode_status,
                    eligible_for_nearest=excluded.eligible_for_nearest,
                    eligible_for_cheapest=excluded.eligible_for_cheapest,
                    notes=excluded.notes,
                    raw_json=excluded.raw_json,
                    updated_at=excluded.updated_at
                """,
                (
                    rec_id,
                    rec["display_name"],
                    rec_type,
                    rec.get("city"),
                    rec.get("address_text"),
                    rec.get("phone_e164"),
                    rec.get("brand"),
                    json.dumps(cats, ensure_ascii=False),
                    rec.get("category_evidence_scope"),
                    json.dumps(s_ids, ensure_ascii=False),
                    json.dumps(s_urls, ensure_ascii=False),
                    rec.get("source_checked_at"),
                    rec.get("merchant_confirmed_at"),
                    rec.get("listing_status"),
                    rec.get("stock_status", "unknown"),
                    rec.get("stock_confirmed_at"),
                    rec.get("stock_quantity"),
                    rec.get("delivery_area_confirmed"),
                    oh_str,
                    rec.get("latitude"),
                    rec.get("longitude"),
                    rec.get("coordinate_source"),
                    rec.get("geocode_status", "not_geocoded"),
                    1 if rec.get("eligible_for_nearest") else 0,
                    1 if rec.get("eligible_for_cheapest") else 0,
                    rec.get("notes", ""),
                    json.dumps(rec, ensure_ascii=False),
                    now,
                ),
            )

            if rec_type == "retail_directory_branch":
                parent_sup_id = "cm_052" if "cimencam" in (rec.get("brand") or "").lower() else None
                conn.execute(
                    """
                    INSERT INTO branches (
                        branch_id, supplier_id, country_code, branch_name,
                        city, address, latitude, longitude, dispatch_radius_km,
                        phone, email, opening_hours, verified_status, source_id,
                        is_active, updated_at, display_name, address_text,
                        phone_e164, location_role, retail_access_claimed,
                        source_ids_json, source_urls_json, source_checked_at,
                        merchant_confirmed_at, coordinate_kind, coordinate_source,
                        geocode_status, eligible_for_nearest, stock_status,
                        stock_quantity, stock_confirmed_at, delivery_area_confirmed,
                        customer_rating, review_count, brand, product_categories_json,
                        notes, data_origin
                    ) VALUES (?, ?, 'CM', ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, 1, ?, ?, ?, ?, 'retail_branch', 1, ?, ?, ?, ?, NULL, ?, ?, 0, ?, ?, ?, ?, NULL, 0, ?, ?, ?, 'cameroon_supplement')
                    ON CONFLICT(branch_id) DO UPDATE SET
                        supplier_id=excluded.supplier_id,
                        branch_name=excluded.branch_name,
                        city=excluded.city,
                        address=excluded.address,
                        latitude=excluded.latitude,
                        longitude=excluded.longitude,
                        phone=excluded.phone,
                        opening_hours=excluded.opening_hours,
                        verified_status=excluded.verified_status,
                        source_id=excluded.source_id,
                        is_active=1,
                        updated_at=excluded.updated_at,
                        display_name=excluded.display_name,
                        address_text=excluded.address_text,
                        phone_e164=excluded.phone_e164,
                        location_role='retail_branch',
                        retail_access_claimed=1,
                        source_ids_json=excluded.source_ids_json,
                        source_urls_json=excluded.source_urls_json,
                        source_checked_at=excluded.source_checked_at,
                        merchant_confirmed_at=excluded.merchant_confirmed_at,
                        coordinate_source=excluded.coordinate_source,
                        geocode_status=excluded.geocode_status,
                        eligible_for_nearest=0,
                        stock_status=excluded.stock_status,
                        stock_quantity=excluded.stock_quantity,
                        stock_confirmed_at=excluded.stock_confirmed_at,
                        delivery_area_confirmed=excluded.delivery_area_confirmed,
                        brand=excluded.brand,
                        product_categories_json=excluded.product_categories_json,
                        notes=excluded.notes,
                        data_origin='cameroon_supplement'
                    """,
                    (
                        rec_id,
                        parent_sup_id,
                        rec["display_name"],
                        rec.get("city"),
                        rec.get("address_text"),
                        rec.get("latitude"),
                        rec.get("longitude"),
                        rec.get("phone_e164"),
                        oh_str,
                        rec.get("geocode_status", "not_geocoded"),
                        s_ids[0] if s_ids else None,
                        now,
                        rec["display_name"],
                        rec.get("address_text"),
                        rec.get("phone_e164"),
                        json.dumps(s_ids, ensure_ascii=False),
                        json.dumps(s_urls, ensure_ascii=False),
                        rec.get("source_checked_at"),
                        rec.get("merchant_confirmed_at"),
                        rec.get("coordinate_source"),
                        rec.get("geocode_status", "not_geocoded"),
                        rec.get("stock_status", "unknown"),
                        rec.get("stock_quantity"),
                        rec.get("stock_confirmed_at"),
                        rec.get("delivery_area_confirmed"),
                        rec.get("brand"),
                        json.dumps(cats, ensure_ascii=False),
                        rec.get("notes", ""),
                    ),
                )
            else:
                # Non-branch Cameroon supplier/manufacturer/vendor record (7 records, including merged cm_052)
                conn.execute(
                    """
                    INSERT INTO suppliers (
                        supplier_id, country_code, display_name, record_type,
                        source_ids_json, source_url, product_categories_json,
                        branch_id, latitude, longitude, delivery_area,
                        online_stock, customer_rating, review_count,
                        supplier_confirmed_at, commercial_status,
                        eligible_for_nearest, eligible_for_cheapest,
                        shared_pricing_notes, notes, is_active, updated_at,
                        source_urls_json, source_checked_at, merchant_confirmed_at,
                        delivery_area_confirmed, website_or_directory_url,
                        stock_status, stock_confirmed_at, discovery_scope,
                        recommendation_eligible, brand, city, address_text,
                        phone_e164, data_origin
                    ) VALUES (?, 'CM', ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, 0, ?, 'requires_local_confirmation', 0, 0, NULL, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'cameroon_supplement')
                    ON CONFLICT(supplier_id) DO UPDATE SET
                        country_code='CM',
                        display_name=excluded.display_name,
                        record_type=excluded.record_type,
                        source_ids_json=excluded.source_ids_json,
                        source_url=excluded.source_url,
                        product_categories_json=excluded.product_categories_json,
                        delivery_area=excluded.delivery_area,
                        online_stock=excluded.online_stock,
                        customer_rating=NULL,
                        review_count=0,
                        supplier_confirmed_at=excluded.supplier_confirmed_at,
                        commercial_status='requires_local_confirmation',
                        eligible_for_nearest=0,
                        eligible_for_cheapest=0,
                        notes=excluded.notes,
                        is_active=1,
                        updated_at=excluded.updated_at,
                        source_urls_json=excluded.source_urls_json,
                        source_checked_at=excluded.source_checked_at,
                        merchant_confirmed_at=excluded.merchant_confirmed_at,
                        delivery_area_confirmed=excluded.delivery_area_confirmed,
                        website_or_directory_url=excluded.website_or_directory_url,
                        stock_status=excluded.stock_status,
                        stock_confirmed_at=excluded.stock_confirmed_at,
                        discovery_scope=excluded.discovery_scope,
                        recommendation_eligible=1,
                        brand=excluded.brand,
                        city=excluded.city,
                        address_text=excluded.address_text,
                        phone_e164=excluded.phone_e164,
                        data_origin='cameroon_supplement'
                    """,
                    (
                        rec_id,
                        rec["display_name"],
                        rec_type,
                        json.dumps(s_ids, ensure_ascii=False),
                        s_urls[0] if s_urls else None,
                        json.dumps(cats, ensure_ascii=False),
                        rec.get("delivery_area_confirmed"),
                        rec.get("stock_status", "unknown"),
                        rec.get("merchant_confirmed_at"),
                        rec.get("notes", ""),
                        now,
                        json.dumps(s_urls, ensure_ascii=False),
                        rec.get("source_checked_at"),
                        rec.get("merchant_confirmed_at"),
                        rec.get("delivery_area_confirmed"),
                        s_urls[0] if s_urls else None,
                        rec.get("stock_status", "unknown"),
                        rec.get("stock_confirmed_at"),
                        rec.get("category_evidence_scope"),
                        rec.get("brand"),
                        rec.get("city"),
                        rec.get("address_text"),
                        rec.get("phone_e164"),
                    ),
                )

        # 8. Upsert 84 price/range observations from global_market_50.json
        for p in global_data.get("price_observations", []):
            obs_id = p["observation_id"]
            amt = p.get("amount")
            amt_min = p.get("amount_min")
            amt_max = p.get("amount_max")
            if amt is not None:
                orig_amt_str = str(amt)
                amt_num = float(amt)
            elif amt_min is not None and amt_max is not None:
                orig_amt_str = f"{amt_min} - {amt_max}"
                amt_num = None
            else:
                orig_amt_str = ""
                amt_num = None

            cat_norm = _normalize_category_code(p.get("category", "cement"))
            unit_norm = _normalize_pack_unit(p.get("unit"))
            tax_inc = p.get("tax_included")
            tax_inc_db = None if tax_inc is None else (1 if tax_inc else 0)

            norm_kg = p.get("normalized_amount_per_kg")
            norm_m3 = p.get("normalized_amount_per_m3")
            if norm_kg is not None:
                norm_val_str = str(norm_kg)
                norm_unit_str = "kg"
            elif norm_m3 is not None:
                norm_val_str = str(norm_m3)
                norm_unit_str = "m3"
            else:
                norm_val_str = None
                norm_unit_str = None

            p_status = p.get("price_status") or (
                "unit_unconfirmed"
                if unit_norm is None
                else (
                    "price_range_observation"
                    if amt is None
                    else "published_snapshot_unconfirmed"
                )
            )
            deliv_inc = (
                p.get("delivery_included_claim")
                if p.get("delivery_included_claim")
                else ("excluded" if p.get("delivery_fee") is None else "unknown")
            )
            spec_obj = {
                "sku": p.get("sku"),
                "source_grade": p.get("source_grade"),
                "product_origin_country": p.get("product_origin_country"),
                "customer_tier": p.get("customer_tier"),
                "payment_condition": p.get("payment_condition"),
                "air_entrainment": p.get("air_entrainment"),
                "intended_use_claim": p.get("intended_use_claim"),
                "service_area_claim": p.get("service_area_claim"),
                "location_context": p.get("location_context"),
            }

            conn.execute(
                """
                INSERT INTO price_snapshots (
                    price_id, country_code, supplier_id, branch_id,
                    source_ids_json, product_name, product_category,
                    specification_json, original_amount, original_currency,
                    original_unit, pack_mass_kg, bulk_density_kg_per_m3,
                    normalized_value, normalized_currency, normalized_unit,
                    published_gross_amount, tax_included, vat_rate_pct,
                    delivery_inclusion, effective_from, valid_until,
                    observed_at, supplier_confirmed_at, price_status,
                    is_live, eligible_for_cheapest, eligible_for_production_benchmark,
                    grade_mapping_status, stock_status, min_order_qty, min_order_fee,
                    notes, is_active, updated_at, amount_numeric, amount_min,
                    amount_max, sku, source_grade, source_url, source_effective_at,
                    evidence_status, price_kind, delivery_fee, handling_fee,
                    delivery_area_confirmed, stock_confirmed_at, quantity_min,
                    quantity_max, customer_tier, payment_condition,
                    product_origin_country, air_entrainment, intended_use_claim,
                    service_area_claim, location_context, delivery_included_claim,
                    normalized_amount_per_kg, normalized_amount_per_m3,
                    normalization_scope, display_caveat,
                    eligible_for_cheapest_delivered, data_origin
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, NULL,
                    ?, ?, ?, ?, NULL, ?, 0, 0, 0, NULL, ?, ?, NULL, ?, 1, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, 0, 'global_market_50'
                )
                ON CONFLICT(price_id) DO UPDATE SET
                    country_code=excluded.country_code,
                    supplier_id=excluded.supplier_id,
                    branch_id=excluded.branch_id,
                    source_ids_json=excluded.source_ids_json,
                    product_name=excluded.product_name,
                    product_category=excluded.product_category,
                    specification_json=excluded.specification_json,
                    original_amount=excluded.original_amount,
                    original_currency=excluded.original_currency,
                    original_unit=excluded.original_unit,
                    pack_mass_kg=excluded.pack_mass_kg,
                    normalized_value=excluded.normalized_value,
                    normalized_currency=excluded.normalized_currency,
                    normalized_unit=excluded.normalized_unit,
                    tax_included=excluded.tax_included,
                    delivery_inclusion=excluded.delivery_inclusion,
                    effective_from=excluded.effective_from,
                    valid_until=excluded.valid_until,
                    observed_at=excluded.observed_at,
                    price_status=excluded.price_status,
                    is_live=0,
                    eligible_for_cheapest=0,
                    stock_status=excluded.stock_status,
                    min_order_qty=excluded.min_order_qty,
                    notes=excluded.notes,
                    is_active=1,
                    updated_at=excluded.updated_at,
                    amount_numeric=excluded.amount_numeric,
                    amount_min=excluded.amount_min,
                    amount_max=excluded.amount_max,
                    sku=excluded.sku,
                    source_grade=excluded.source_grade,
                    source_url=excluded.source_url,
                    source_effective_at=excluded.source_effective_at,
                    evidence_status=excluded.evidence_status,
                    price_kind=excluded.price_kind,
                    delivery_fee=excluded.delivery_fee,
                    handling_fee=excluded.handling_fee,
                    delivery_area_confirmed=excluded.delivery_area_confirmed,
                    stock_confirmed_at=excluded.stock_confirmed_at,
                    quantity_min=excluded.quantity_min,
                    quantity_max=excluded.quantity_max,
                    customer_tier=excluded.customer_tier,
                    payment_condition=excluded.payment_condition,
                    product_origin_country=excluded.product_origin_country,
                    air_entrainment=excluded.air_entrainment,
                    intended_use_claim=excluded.intended_use_claim,
                    service_area_claim=excluded.service_area_claim,
                    location_context=excluded.location_context,
                    delivery_included_claim=excluded.delivery_included_claim,
                    normalized_amount_per_kg=excluded.normalized_amount_per_kg,
                    normalized_amount_per_m3=excluded.normalized_amount_per_m3,
                    normalization_scope=excluded.normalization_scope,
                    display_caveat=excluded.display_caveat,
                    eligible_for_cheapest_delivered=0,
                    data_origin='global_market_50'
                """,
                (
                    obs_id,
                    p["country_code"].upper(),
                    p["supplier_id"],
                    p.get("branch_id"),
                    json.dumps(p.get("source_ids", []), ensure_ascii=False),
                    p["product_name"],
                    cat_norm,
                    json.dumps(spec_obj, ensure_ascii=False),
                    orig_amt_str,
                    p["currency"].upper(),
                    unit_norm,
                    float(p["pack_mass_kg"]) if p.get("pack_mass_kg") is not None else None,
                    norm_val_str,
                    p["currency"].upper() if norm_val_str is not None else None,
                    norm_unit_str,
                    tax_inc_db,
                    deliv_inc,
                    p.get("source_effective_at"),
                    p.get("valid_until"),
                    p.get("observed_at"),
                    p_status,
                    p.get("stock_status", "unknown"),
                    str(p["quantity_min"]) if p.get("quantity_min") is not None else None,
                    p.get("notes") or p.get("display_caveat") or "",
                    now,
                    amt_num,
                    float(amt_min) if amt_min is not None else None,
                    float(amt_max) if amt_max is not None else None,
                    p.get("sku"),
                    p.get("source_grade"),
                    p.get("source_url"),
                    p.get("source_effective_at"),
                    p.get("evidence_status", "unconfirmed_publication_snapshot"),
                    p.get("price_kind", "public_catalog_snapshot"),
                    str(p["delivery_fee"]) if p.get("delivery_fee") is not None else None,
                    str(p["handling_fee"]) if p.get("handling_fee") is not None else None,
                    p.get("delivery_area_confirmed"),
                    p.get("stock_confirmed_at"),
                    int(p["quantity_min"]) if p.get("quantity_min") is not None else None,
                    int(p["quantity_max"]) if p.get("quantity_max") is not None else None,
                    p.get("customer_tier", "unspecified"),
                    p.get("payment_condition"),
                    p.get("product_origin_country"),
                    p.get("air_entrainment"),
                    p.get("intended_use_claim"),
                    p.get("service_area_claim"),
                    p.get("location_context"),
                    p.get("delivery_included_claim"),
                    float(norm_kg) if norm_kg is not None else None,
                    float(norm_m3) if norm_m3 is not None else None,
                    p.get("normalization_scope"),
                    p.get("display_caveat"),
                ),
            )

        # Explicit Dufferin scope correction ensuring air_entrainment and intended_use_claim are cleared:
        conn.execute(
            """
            UPDATE price_snapshots
            SET air_entrainment = NULL,
                intended_use_claim = NULL
            WHERE price_id IN ('ca-price-019', 'ca-price-020', 'ca-price-021')
            """
        )

        # 9. Upsert 7 Cameroon numeric price observations from cameroon_market_supplement.json
        for cp in cm_data.get("price_observations", []):
            obs_id = cp["observation_id"]
            amt_num = float(cp["amount"])
            norm_kg = cp.get("normalized_amount_per_kg")
            tax_inc = cp.get("tax_included")
            tax_inc_db = None if tax_inc is None else (1 if tax_inc else 0)
            spec_obj = {
                "brand": cp.get("brand"),
                "cement_designation": cp.get("cement_designation"),
                "price_city": cp.get("price_city"),
                "minimum_quantity_bags": cp.get("minimum_quantity_bags"),
                "maximum_quantity_bags": cp.get("maximum_quantity_bags"),
            }
            conn.execute(
                """
                INSERT INTO price_snapshots (
                    price_id, country_code, supplier_id, branch_id,
                    source_ids_json, product_name, product_category,
                    specification_json, original_amount, original_currency,
                    original_unit, pack_mass_kg, bulk_density_kg_per_m3,
                    normalized_value, normalized_currency, normalized_unit,
                    published_gross_amount, tax_included, vat_rate_pct,
                    delivery_inclusion, effective_from, valid_until,
                    observed_at, supplier_confirmed_at, price_status,
                    is_live, eligible_for_cheapest, eligible_for_production_benchmark,
                    grade_mapping_status, stock_status, min_order_qty, min_order_fee,
                    notes, is_active, updated_at, amount_numeric, amount_min,
                    amount_max, sku, source_grade, source_url, source_effective_at,
                    evidence_status, price_kind, delivery_fee, handling_fee,
                    delivery_area_confirmed, stock_confirmed_at, quantity_min,
                    quantity_max, customer_tier, payment_condition,
                    product_origin_country, air_entrainment, intended_use_claim,
                    service_area_claim, location_context, delivery_included_claim,
                    normalized_amount_per_kg, normalized_amount_per_m3,
                    normalization_scope, display_caveat,
                    eligible_for_cheapest_delivered, data_origin
                ) VALUES (
                    ?, 'CM', ?, ?, ?, ?, ?, ?, ?, ?, 'bag', ?, NULL, ?, ?, 'kg', NULL, ?, NULL,
                    'unknown', ?, ?, ?, NULL, 'published_snapshot_unconfirmed', 0, 0, 0, NULL, ?, ?, NULL, ?, 1, ?,
                    ?, NULL, NULL, NULL, ?, ?, ?, 'unconfirmed_publication_snapshot', ?, NULL, NULL,
                    ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL,
                    ?, NULL, 'arithmetic_unit_conversion_only_not_product_equivalence', ?, 0, 'cameroon_supplement'
                )
                ON CONFLICT(price_id) DO UPDATE SET
                    supplier_id=excluded.supplier_id,
                    branch_id=excluded.branch_id,
                    source_ids_json=excluded.source_ids_json,
                    product_name=excluded.product_name,
                    product_category=excluded.product_category,
                    specification_json=excluded.specification_json,
                    original_amount=excluded.original_amount,
                    original_currency=excluded.original_currency,
                    original_unit='bag',
                    pack_mass_kg=excluded.pack_mass_kg,
                    normalized_value=excluded.normalized_value,
                    normalized_currency=excluded.normalized_currency,
                    normalized_unit='kg',
                    tax_included=excluded.tax_included,
                    effective_from=excluded.effective_from,
                    valid_until=excluded.valid_until,
                    observed_at=excluded.observed_at,
                    price_status='published_snapshot_unconfirmed',
                    is_live=0,
                    eligible_for_cheapest=0,
                    stock_status=excluded.stock_status,
                    min_order_qty=excluded.min_order_qty,
                    notes=excluded.notes,
                    is_active=1,
                    updated_at=excluded.updated_at,
                    amount_numeric=excluded.amount_numeric,
                    source_grade=excluded.source_grade,
                    source_url=excluded.source_url,
                    source_effective_at=excluded.source_effective_at,
                    price_kind=excluded.price_kind,
                    delivery_area_confirmed=excluded.delivery_area_confirmed,
                    stock_confirmed_at=excluded.stock_confirmed_at,
                    quantity_min=excluded.quantity_min,
                    quantity_max=excluded.quantity_max,
                    customer_tier=excluded.customer_tier,
                    location_context=excluded.location_context,
                    normalized_amount_per_kg=excluded.normalized_amount_per_kg,
                    display_caveat=excluded.display_caveat,
                    eligible_for_cheapest_delivered=0,
                    data_origin='cameroon_supplement'
                """,
                (
                    obs_id,
                    cp["supplier_record_id"],
                    cp.get("branch_id"),
                    json.dumps([cp["source_id"]], ensure_ascii=False),
                    cp["product_name"],
                    _normalize_category_code(cp.get("category", "cement")),
                    json.dumps(spec_obj, ensure_ascii=False),
                    str(cp["amount"]),
                    cp["currency"].upper(),
                    float(cp["pack_mass_kg"]) if cp.get("pack_mass_kg") is not None else 50.0,
                    str(norm_kg) if norm_kg is not None else None,
                    cp["currency"].upper(),
                    tax_inc_db,
                    cp.get("source_effective_at"),
                    cp.get("valid_until"),
                    cp.get("observed_at"),
                    cp.get("stock_status", "unknown"),
                    str(cp["minimum_quantity_bags"]) if cp.get("minimum_quantity_bags") is not None else None,
                    cp.get("display_caveat", ""),
                    now,
                    amt_num,
                    cp.get("cement_designation"),
                    cp.get("source_url"),
                    cp.get("source_effective_at"),
                    cp.get("price_kind", "public_catalog_snapshot_unconfirmed"),
                    cp.get("delivery_area_confirmed"),
                    cp.get("stock_confirmed_at"),
                    int(cp["minimum_quantity_bags"]) if cp.get("minimum_quantity_bags") is not None else None,
                    int(cp["maximum_quantity_bags"]) if cp.get("maximum_quantity_bags") is not None else None,
                    "bulk_600_plus_bags" if (cp.get("minimum_quantity_bags") or 1) >= 600 else "retail_1_to_599_bags",
                    cp.get("price_city"),
                    float(norm_kg) if norm_kg is not None else None,
                    cp.get("display_caveat"),
                ),
            )

        # 10. Upsert 10 global availability observations + 7 Cameroon catalog observations
        for av in global_data.get("availability_observations", []):
            conn.execute(
                """
                INSERT INTO availability_observations (
                    observation_id, country_code, supplier_id, branch_id,
                    sku, product_name, category, city, published_claim,
                    claim_scope, website_reported_quantity, confirmed_quantity,
                    published_mass_kg, price_access, stock_status,
                    stock_confirmed_at, is_live_inventory, observed_at,
                    source_effective_at, source_ids_json, source_url,
                    notes, data_origin, is_active, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'global_market_50', 1, ?)
                ON CONFLICT(observation_id) DO UPDATE SET
                    country_code=excluded.country_code,
                    supplier_id=excluded.supplier_id,
                    branch_id=excluded.branch_id,
                    sku=excluded.sku,
                    product_name=excluded.product_name,
                    category=excluded.category,
                    published_claim=excluded.published_claim,
                    claim_scope=excluded.claim_scope,
                    website_reported_quantity=excluded.website_reported_quantity,
                    confirmed_quantity=excluded.confirmed_quantity,
                    stock_status=excluded.stock_status,
                    stock_confirmed_at=excluded.stock_confirmed_at,
                    is_live_inventory=0,
                    observed_at=excluded.observed_at,
                    source_effective_at=excluded.source_effective_at,
                    source_ids_json=excluded.source_ids_json,
                    source_url=excluded.source_url,
                    notes=excluded.notes,
                    data_origin='global_market_50',
                    is_active=1,
                    updated_at=excluded.updated_at
                """,
                (
                    av["observation_id"],
                    av["country_code"].upper(),
                    av.get("supplier_id"),
                    av.get("branch_id"),
                    av.get("sku"),
                    av["product_name"],
                    _normalize_category_code(av.get("category", "cement")),
                    av["published_claim"],
                    av.get("claim_scope"),
                    av.get("website_reported_quantity"),
                    av.get("confirmed_quantity"),
                    "reported_out_of_stock"
                    if "out_of_stock" in (av.get("published_claim") or "")
                    else "reported_available_unconfirmed",
                    av.get("stock_confirmed_at"),
                    1 if av.get("is_live_inventory") else 0,
                    av.get("observed_at"),
                    av.get("source_effective_at"),
                    json.dumps(av.get("source_ids", []), ensure_ascii=False),
                    av.get("source_url"),
                    av.get("notes", ""),
                    now,
                ),
            )

        for cat_obs in cm_data.get("catalog_observations", []):
            conn.execute(
                """
                INSERT INTO availability_observations (
                    observation_id, country_code, supplier_id, branch_id,
                    sku, product_name, category, city, published_claim,
                    claim_scope, website_reported_quantity, confirmed_quantity,
                    published_mass_kg, price_access, stock_status,
                    stock_confirmed_at, is_live_inventory, observed_at,
                    source_effective_at, source_ids_json, source_url,
                    notes, data_origin, is_active, updated_at
                ) VALUES (?, 'CM', ?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, 0, ?, NULL, ?, ?, ?, 'cameroon_supplement', 1, ?)
                ON CONFLICT(observation_id) DO UPDATE SET
                    supplier_id=excluded.supplier_id,
                    branch_id=excluded.branch_id,
                    product_name=excluded.product_name,
                    category=excluded.category,
                    city=excluded.city,
                    published_claim=excluded.published_claim,
                    claim_scope=excluded.claim_scope,
                    confirmed_quantity=excluded.confirmed_quantity,
                    published_mass_kg=excluded.published_mass_kg,
                    price_access=excluded.price_access,
                    stock_status=excluded.stock_status,
                    is_live_inventory=0,
                    observed_at=excluded.observed_at,
                    source_ids_json=excluded.source_ids_json,
                    source_url=excluded.source_url,
                    notes=excluded.notes,
                    data_origin='cameroon_supplement',
                    is_active=1,
                    updated_at=excluded.updated_at
                """,
                (
                    cat_obs["catalog_id"],
                    cat_obs.get("seller_record_id"),
                    cat_obs.get("branch_id"),
                    cat_obs["product_name"],
                    _normalize_category_code(cat_obs.get("category", "cement")),
                    cat_obs.get("city"),
                    cat_obs.get("stock_claim_as_published", "available_on_order"),
                    f"Bativel platform catalog ({cat_obs.get('city') or 'Cameroon'}); price_access={cat_obs.get('price_access')}",
                    cat_obs.get("confirmed_quantity"),
                    float(cat_obs["published_mass_kg"]) if cat_obs.get("published_mass_kg") is not None else None,
                    cat_obs.get("price_access"),
                    cat_obs.get("stock_status", "unconfirmed"),
                    cat_obs.get("observed_at"),
                    json.dumps([cat_obs["source_id"]], ensure_ascii=False),
                    cat_obs.get("source_url"),
                    cat_obs.get("notes", ""),
                    now,
                ),
            )

        # Compute exact post-import verification summary
        counts = {
            "total_countries": conn.execute("SELECT COUNT(*) FROM countries").fetchone()[0],
            "refreshed_50_countries": conn.execute(
                "SELECT COUNT(*) FROM countries WHERE market_refresh_status = 'researched_50_market_refresh'"
            ).fetchone()[0],
            "prior_lead_countries": conn.execute(
                "SELECT COUNT(*) FROM countries WHERE market_refresh_status != 'researched_50_market_refresh'"
            ).fetchone()[0],
            "global_50_suppliers": conn.execute(
                "SELECT COUNT(*) FROM suppliers WHERE data_origin = 'global_market_50' AND is_active = 1"
            ).fetchone()[0],
            "global_50_branches": conn.execute(
                "SELECT COUNT(*) FROM branches WHERE data_origin = 'global_market_50' AND is_active = 1"
            ).fetchone()[0],
            "global_50_retail_outlets": conn.execute(
                "SELECT COUNT(*) FROM branches WHERE data_origin = 'global_market_50' AND is_active = 1 AND location_role IN ('retail_branch', 'distributor_branch', 'sales_outlet')"
            ).fetchone()[0],
            "global_50_plants_and_terminals": conn.execute(
                "SELECT COUNT(*) FROM branches WHERE data_origin = 'global_market_50' AND is_active = 1 AND location_role IN ('ready_mix_plant', 'cement_plant_contact', 'aggregate_plant', 'dry_mortar_plant', 'bulk_cement_terminal', 'precast_concrete_plant')"
            ).fetchone()[0],
            "global_50_other_contacts": conn.execute(
                "SELECT COUNT(*) FROM branches WHERE data_origin = 'global_market_50' AND is_active = 1 AND location_role NOT IN ('retail_branch', 'distributor_branch', 'sales_outlet', 'ready_mix_plant', 'cement_plant_contact', 'aggregate_plant', 'dry_mortar_plant', 'bulk_cement_terminal', 'precast_concrete_plant')"
            ).fetchone()[0],
            "physical_branch_coordinates": conn.execute(
                "SELECT COUNT(*) FROM branches WHERE data_origin = 'global_market_50' AND is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL"
            ).fetchone()[0],
            "eligible_for_nearest_coordinates": conn.execute(
                "SELECT COUNT(*) FROM branches WHERE data_origin = 'global_market_50' AND is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL AND eligible_for_nearest = 1"
            ).fetchone()[0],
            "cameroon_discovery_records": conn.execute(
                "SELECT COUNT(*) FROM cameroon_discovery_records"
            ).fetchone()[0],
            "cameroon_supplier_records": conn.execute(
                "SELECT COUNT(*) FROM suppliers WHERE data_origin = 'cameroon_supplement' AND is_active = 1"
            ).fetchone()[0],
            "cameroon_retail_directory_branches": conn.execute(
                "SELECT COUNT(*) FROM branches WHERE data_origin = 'cameroon_supplement' AND is_active = 1"
            ).fetchone()[0],
            "preserved_non_50_suppliers": conn.execute(
                "SELECT COUNT(*) FROM suppliers WHERE data_origin = 'legacy_seed' AND is_active = 1"
            ).fetchone()[0],
            "refreshed_50_price_observations": conn.execute(
                "SELECT COUNT(*) FROM price_snapshots WHERE data_origin IN ('global_market_50', 'cameroon_supplement') AND is_active = 1"
            ).fetchone()[0],
            "refreshed_50_single_numeric_prices": conn.execute(
                "SELECT COUNT(*) FROM price_snapshots WHERE data_origin IN ('global_market_50', 'cameroon_supplement') AND is_active = 1 AND amount_numeric IS NOT NULL"
            ).fetchone()[0],
            "refreshed_50_range_prices": conn.execute(
                "SELECT COUNT(*) FROM price_snapshots WHERE data_origin IN ('global_market_50', 'cameroon_supplement') AND is_active = 1 AND amount_numeric IS NULL AND amount_min IS NOT NULL"
            ).fetchone()[0],
            "preserved_non_50_price_snapshots": conn.execute(
                "SELECT COUNT(*) FROM price_snapshots WHERE data_origin = 'legacy_seed' AND is_active = 1"
            ).fetchone()[0],
            "historical_quarantined_or_superseded_prices": conn.execute(
                "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 0"
            ).fetchone()[0],
            "availability_observations": conn.execute(
                "SELECT COUNT(*) FROM availability_observations WHERE is_active = 1"
            ).fetchone()[0],
            "data_quality_actions_applied": conn.execute(
                "SELECT COUNT(*) FROM data_quality_actions"
            ).fetchone()[0],
            "total_sources": conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0],
        }

        log_audit_event(
            conn=conn,
            actor=actor,
            role="admin",
            action="import_50_country_refresh",
            entity_type="market_refresh_50",
            entity_id="global_market_50_and_cm_supplement",
            details=counts,
        )
        conn.commit()
        return {"status": "imported_50_country_refresh", "counts": counts}
    finally:
        conn.close()


def get_map_seed_geojson(pack_dir: Optional[Path] = None) -> Dict[str, Any]:
    """Return the verified physical branch pin GeoJSON (`map_seed.geojson`)."""
    p_dir = pack_dir or get_research_pack_50_dir()
    geo_path = p_dir / "map_seed.geojson"
    if not geo_path.exists():
        return {"type": "FeatureCollection", "features": []}
    return json.loads(geo_path.read_text(encoding="utf-8"))


def ensure_market_seeded(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Ensure the SQLite database exists, has imported the initial seed (preserving
    non-50-country prior leads and historical snapshots), and has applied the
    idempotent 50-country market refresh.
    """
    init_market_db(db_path)
    conn = get_connection(db_path)
    try:
        cnt_countries = conn.execute("SELECT COUNT(*) FROM countries").fetchone()[0]
        cnt_refreshed_50 = conn.execute(
            "SELECT COUNT(*) FROM countries WHERE market_refresh_status = 'researched_50_market_refresh'"
        ).fetchone()[0]
        cnt_cm_disc = conn.execute(
            "SELECT COUNT(*) FROM cameroon_discovery_records"
        ).fetchone()[0]
        cnt_branches = conn.execute(
            "SELECT COUNT(*) FROM branches WHERE data_origin = 'global_market_50' AND is_active = 1"
        ).fetchone()[0]
    finally:
        conn.close()

    if cnt_countries == 0:
        try:
            staged = stage_research_pack(db_path=db_path, actor="bootstrap_seeder")
            approve_staged_import(
                batch_id=staged["batch_id"],
                db_path=db_path,
                approver="bootstrap_seeder",
            )
        except FileNotFoundError:
            pass

    if cnt_refreshed_50 < 50 or cnt_cm_disc < 40 or cnt_branches < 3451:
        return import_50_country_refresh(db_path=db_path, actor="bootstrap_seeder")

    return {"status": "already_seeded", "countries_count": cnt_countries, "refreshed_50_count": cnt_refreshed_50, "branches_count": cnt_branches}

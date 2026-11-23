"""
Core business logic for AstraMix Materials Market (50-Country Refresh):
- Coverage & honest directory overview across 100 locality-supported countries (50 refreshed markets + 50 prior-lead markets)
- Progressive market discovery (1. Local branches/outlets, 2. Service-area suppliers, 3. Country buying channels & quote contacts)
- Strict category separation (cement, ready_mix, dry_concrete, masonry_cement, cement_adhesive, floor_hardener, repair_mortar, mortar, grout, aggregates, sand, admixtures, scm)
- Quantity tier, trade eligibility, payment condition, product origin, and price-range preservation
- Scoped availability states ('Reported available', 'Reported out of stock', 'On order', 'Check branch', 'Stock unknown')
- Separate sorting modes ('recommended', 'lowest_published_price'/'lowest_delivered_total', 'nearest_mapped_store'/'nearest', 'highest_reviewed')
- Price filter with explicit exclusion explanation so quote-only channels never vanish silently
- Genuine customer review submission, anti-duplicate gating, and moderation ('No verified reviews yet' default)
- Role-protected Admin CRUD, 50-country refresh import, and audit logging
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from astramix.domain.input_schema import MATERIAL_FEATURE_ORDER
from astramix.market.db import (
    _normalize_category_code,
    _utc_now_iso,
    approve_staged_import,
    ensure_market_seeded,
    get_connection,
    get_map_seed_geojson,
    import_50_country_refresh,
    log_audit_event,
    stage_research_pack,
)
from astramix.market.locations import GEONAMES_ATTRIBUTION, normalize_location_text
from astramix.market.providers import GeocodingAdapter, RouteDistanceResult, RoutingAdapter
from astramix.market.units import (
    MissingBulkDensityError,
    UnitConversionError,
    calculate_ready_mix_order,
    convert_quantity,
    quantize_money,
    round_to_whole_bags,
    to_decimal,
)

INGREDIENT_LABELS: Dict[str, str] = {
    "cement": "Portland & Blended Cement",
    "blast_furnace_slag": "Blast Furnace Slag (GGBS)",
    "fly_ash": "Coal Fly Ash",
    "water": "Mixing Water",
    "superplasticizer": "Superplasticizer / Admixture",
    "coarse_aggregate": "Coarse Aggregate (Gravel / Crushed Stone)",
    "fine_aggregate": "Fine Aggregate (Sand)",
    "aggregates": "Aggregates (Sand & Gravel)",
    "sand": "Construction Sand",
    "ready_mix": "Ready-Mixed Concrete",
    "dry_concrete": "Bagged Dry Concrete Mix",
    "mortar": "Masonry / Rendering Mortar",
    "masonry_cement": "Masonry Cement (Non-Structural)",
    "cement_adhesive": "Cementitious Tile Adhesive",
    "floor_hardener": "Dry-Shake Floor Hardener",
    "repair_mortar": "Concrete Repair Mortar",
    "grout": "Cementitious Grout",
}

DEFAULT_BAG_SIZES_KG: Dict[str, int] = {
    "cement": 50,
    "blast_furnace_slag": 25,
    "fly_ash": 25,
    "dry_concrete": 25,
    "mortar": 25,
    "masonry_cement": 50,
    "cement_adhesive": 25,
    "floor_hardener": 25,
    "repair_mortar": 25,
}

WALK_IN_RETAIL_ROLES = {"retail_branch", "distributor_branch", "sales_outlet"}

SPECIALTY_NON_SUBSTITUTE_CATEGORIES = {
    "ready_mix",
    "dry_concrete",
    "masonry_cement",
    "cement_adhesive",
    "floor_hardener",
    "repair_mortar",
    "mortar",
    "grout",
}


def get_market_overview(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Return honest coverage counts and import rules for the 50-country Materials Market."""
    ensure_market_seeded(db_path)
    conn = get_connection(db_path)
    try:
        country_count = conn.execute("SELECT COUNT(*) FROM countries").fetchone()[0]
        refreshed_50_count = conn.execute(
            "SELECT COUNT(*) FROM countries WHERE market_refresh_status = 'researched_50_market_refresh'"
        ).fetchone()[0]
        prior_lead_country_count = conn.execute(
            "SELECT COUNT(*) FROM countries WHERE market_refresh_status != 'researched_50_market_refresh'"
        ).fetchone()[0]
        countries_with_prices = conn.execute(
            "SELECT COUNT(DISTINCT country_code) FROM price_snapshots WHERE is_active = 1"
        ).fetchone()[0]
        refreshed_50_countries_with_prices = conn.execute(
            """
            SELECT COUNT(DISTINCT country_code)
            FROM price_snapshots
            WHERE is_active = 1 AND data_origin IN ('global_market_50', 'cameroon_supplement')
            """
        ).fetchone()[0]
        refreshed_50_quote_only_countries = refreshed_50_count - refreshed_50_countries_with_prices

        global_50_supplier_count = conn.execute(
            "SELECT COUNT(*) FROM suppliers WHERE is_active = 1 AND data_origin = 'global_market_50'"
        ).fetchone()[0]
        cameroon_supplier_count = conn.execute(
            "SELECT COUNT(*) FROM suppliers WHERE is_active = 1 AND data_origin = 'cameroon_supplement'"
        ).fetchone()[0]
        preserved_prior_supplier_count = conn.execute(
            "SELECT COUNT(*) FROM suppliers WHERE is_active = 1 AND data_origin = 'legacy_seed'"
        ).fetchone()[0]
        total_active_supplier_count = conn.execute(
            "SELECT COUNT(*) FROM suppliers WHERE is_active = 1"
        ).fetchone()[0]

        global_50_branch_count = conn.execute(
            "SELECT COUNT(*) FROM branches WHERE is_active = 1 AND data_origin = 'global_market_50'"
        ).fetchone()[0]
        global_50_retail_outlet_count = conn.execute(
            """
            SELECT COUNT(*) FROM branches
            WHERE is_active = 1
              AND data_origin = 'global_market_50'
              AND location_role IN ('retail_branch', 'distributor_branch', 'sales_outlet')
            """
        ).fetchone()[0]
        cameroon_discovery_record_count = conn.execute(
            "SELECT COUNT(*) FROM cameroon_discovery_records"
        ).fetchone()[0]
        cameroon_retail_branch_count = conn.execute(
            "SELECT COUNT(*) FROM branches WHERE is_active = 1 AND data_origin = 'cameroon_supplement'"
        ).fetchone()[0]
        physical_branch_coord_count = conn.execute(
            "SELECT COUNT(*) FROM branches WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL AND eligible_for_nearest = 1"
        ).fetchone()[0]

        refreshed_50_price_count = conn.execute(
            "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 1 AND data_origin IN ('global_market_50', 'cameroon_supplement')"
        ).fetchone()[0]
        refreshed_50_single_numeric_count = conn.execute(
            """
            SELECT COUNT(*) FROM price_snapshots
            WHERE is_active = 1
              AND data_origin IN ('global_market_50', 'cameroon_supplement')
              AND amount_numeric IS NOT NULL
            """
        ).fetchone()[0]
        refreshed_50_range_count = conn.execute(
            """
            SELECT COUNT(*) FROM price_snapshots
            WHERE is_active = 1
              AND data_origin IN ('global_market_50', 'cameroon_supplement')
              AND amount_numeric IS NULL
              AND amount_min IS NOT NULL
            """
        ).fetchone()[0]
        total_active_price_count = conn.execute(
            "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 1"
        ).fetchone()[0]
        historical_price_count = conn.execute(
            "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 0"
        ).fetchone()[0]
        live_quote_count = conn.execute(
            "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 1 AND is_live = 1"
        ).fetchone()[0]
        availability_obs_count = conn.execute(
            "SELECT COUNT(*) FROM availability_observations WHERE is_active = 1"
        ).fetchone()[0]
        benchmark_count = conn.execute(
            "SELECT COUNT(*) FROM benchmark_references"
        ).fetchone()[0]
        review_count = conn.execute(
            "SELECT COUNT(*) FROM reviews WHERE moderation_state = 'approved' AND verified_purchase = 1"
        ).fetchone()[0]
        source_count = conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
        dq_count = conn.execute("SELECT COUNT(*) FROM data_quality_actions").fetchone()[0]

        countries_rows = conn.execute(
            """
            SELECT country_code, country_name, display_currency, coverage_status,
                   market_refresh_status, locales_json, location_suggestion_count,
                   supplier_or_network_records, external_discovery_records,
                   branch_or_contact_locations, retail_or_distributor_locations,
                   external_retail_directory_branches, price_snapshot_count,
                   single_numeric_price_observations, price_range_observations,
                   availability_observations, external_catalog_observations,
                   physical_branch_coordinates, published_price_coverage,
                   requires_quote_for_numeric_pricing, verified_review_sets,
                   benchmark_reference_count, live_inventory_connected,
                   live_supplier_quote_count, source_observed_at, notes
            FROM countries
            ORDER BY
                CASE WHEN market_refresh_status = 'researched_50_market_refresh' THEN 0 ELSE 1 END,
                country_name ASC
            """
        ).fetchall()

        countries_list = []
        for r in countries_rows:
            d = dict(r)
            try:
                d["locales"] = json.loads(d.pop("locales_json", "[]") or "[]")
            except Exception:
                d["locales"] = []
            d["is_refreshed_50"] = d.get("market_refresh_status") == "researched_50_market_refresh"
            countries_list.append(d)

        return {
            "coverage": {
                "country_count": country_count,
                "refreshed_50_country_count": refreshed_50_count,
                "prior_lead_fallback_country_count": prior_lead_country_count,
                "countries_with_price_snapshots": countries_with_prices,
                "refreshed_50_countries_with_prices": refreshed_50_countries_with_prices,
                "refreshed_50_quote_only_countries": refreshed_50_quote_only_countries,
                "supplier_count": total_active_supplier_count,
                "global_50_supplier_count": global_50_supplier_count,
                "cameroon_supplier_count": cameroon_supplier_count,
                "preserved_prior_supplier_count": preserved_prior_supplier_count,
                "verified_branch_count": physical_branch_coord_count,
                "total_branch_count": global_50_branch_count + cameroon_retail_branch_count,
                "global_50_branch_count": global_50_branch_count,
                "global_50_retail_outlet_count": global_50_retail_outlet_count,
                "cameroon_discovery_record_count": cameroon_discovery_record_count,
                "cameroon_retail_branch_count": cameroon_retail_branch_count,
                "cameroon_retail_directory_branch_count": cameroon_retail_branch_count,
                "physical_branch_coordinate_count": physical_branch_coord_count,
                "price_snapshot_count": total_active_price_count,
                "refreshed_50_price_observation_count": refreshed_50_price_count,
                "preserved_prior_price_snapshot_count": total_active_price_count - refreshed_50_price_count,
                "refreshed_50_single_numeric_price_count": refreshed_50_single_numeric_count,
                "refreshed_50_price_range_count": refreshed_50_range_count,
                "historical_price_record_count": historical_price_count,
                "availability_observation_count": availability_obs_count,
                "live_confirmed_quote_count": live_quote_count,
                "benchmark_reference_count": benchmark_count,
                "verified_review_count": review_count,
                "source_count": source_count,
                "data_quality_action_count": dq_count,
                "locality_suggestion_total": 62964,
            },
            "countries": countries_list,
            "geonames_attribution": GEONAMES_ATTRIBUTION,
            "disclaimers": [
                "50 refreshed markets (checked 2026-10-18) within a 100-country GeoNames locality fallback. Other countries retain prior leads only.",
                "Outside Cameroon: 135 supplier/network/dealer records and 102 selected branch/contact locations (72 retail/distributor/sales outlets). Cameroon supplement: 40 discovery records including 33 retail directory branches (never counted as 40 parent companies).",
                "91 published price observations across 42 markets (89 single numeric amounts and 2 ranges). Zero are confirmed cheapest delivered quotes; tax, delivery, and current stock require merchant confirmation.",
                "Côte d'Ivoire, Chile, China, Georgia, Kenya, Nigeria, Saudi Arabia, and Tanzania have verified buying channels and quote contacts with no public numeric price imported in this pass.",
                "No live merchant inventory feeds or verified customer review feeds are connected ('No verified reviews yet').",
            ],
        }
    finally:
        conn.close()


def generate_basket_from_mix(
    mix: Dict[str, Any],
    volume_m3: Any = 1.0,
    bag_sizes_override: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    """
    Convert a Mix Lab recipe (kg/m³) and project volume (m³) into a Materials Market
    ingredient basket with exact Decimal quantities and whole-bag rounding previews.
    """
    vol = to_decimal(volume_m3, "volume_m3")
    if vol <= Decimal("0"):
        raise ValueError("Project volume_m3 must be > 0.")

    bag_sizes = dict(DEFAULT_BAG_SIZES_KG)
    if bag_sizes_override:
        bag_sizes.update(bag_sizes_override)

    items: List[Dict[str, Any]] = []
    total_mass_kg = Decimal("0")

    for mat in MATERIAL_FEATURE_ORDER:
        raw_qty = mix.get(mat, 0.0)
        per_m3 = to_decimal(raw_qty, mat)
        if per_m3 <= Decimal("0"):
            continue
        req_kg = (per_m3 * vol).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        req_tonnes = (req_kg / Decimal("1000")).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        total_mass_kg += req_kg

        bag_preview = None
        if mat in bag_sizes:
            bp = round_to_whole_bags(req_kg, bag_sizes[mat])
            bag_preview = {
                "pack_size_kg": float(bp.pack_size_kg),
                "required_kg": str(bp.required_kg),
                "bags_needed": bp.bags_needed,
                "purchased_kg": str(bp.purchased_kg),
                "surplus_kg": str(bp.surplus_kg),
            }

        items.append({
            "material_key": mat,
            "label": INGREDIENT_LABELS.get(mat, mat),
            "recipe_kg_per_m3": float(per_m3),
            "required_kg": str(req_kg),
            "required_tonnes": str(req_tonnes),
            "preferred_unit": "bag" if mat == "cement" and req_kg <= Decimal("2000") else (
                "tonne" if req_kg >= Decimal("1000") else "kg"
            ),
            "bag_rounding_preview": bag_preview,
        })

    return {
        "project_volume_m3": str(vol.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "curing_age_days": int(mix.get("age", 28)),
        "total_required_mass_kg": str(total_mass_kg.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "items": items,
    }


def _freshness_score_and_label(
    observed_at: Optional[str],
    confirmed_at: Optional[str],
    is_live: bool,
    effective_at: Optional[str] = None,
) -> Tuple[float, str]:
    ref_date_str = confirmed_at or observed_at or effective_at
    if is_live and confirmed_at:
        return 1.0, f"Confirmed live quote ({confirmed_at})"
    if not ref_date_str:
        return 0.2, "Undated observation"
    eff_suffix = f" (effective {effective_at[:10]})" if effective_at else ""
    try:
        dt = datetime.fromisoformat(ref_date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age_days = max(0, (now - dt).days)
        if is_live and age_days <= 7:
            return 1.0, f"Live confirmed ({age_days}d old)"
        if age_days <= 30:
            return 0.75, f"Checked {ref_date_str[:10]}{eff_suffix}"
        if age_days <= 180:
            return 0.45, f"Published snapshot ({ref_date_str[:10]}){eff_suffix}"
        return 0.25, f"Historical snapshot ({ref_date_str[:10]}){eff_suffix}"
    except Exception:
        return 0.4, f"Checked {ref_date_str}{eff_suffix}"


def _compute_bayesian_review_score(
    review_count: int,
    mean_rating: Optional[float],
    prior_weight: float = 5.0,
    prior_mean: float = 3.5,
) -> Optional[float]:
    if review_count <= 0 or mean_rating is None:
        return None
    v = float(review_count)
    m = float(prior_weight)
    r = float(mean_rating)
    c = float(prior_mean)
    return round((v / (v + m)) * r + (m / (v + m)) * c, 4)


def _format_availability_badge(
    stock_status: Optional[str],
    avail_obs: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Map supplier/branch/observation stock evidence to the 5 honest states:
    'Reported available', 'Reported out of stock', 'On order', 'Check branch', 'Stock unknown'.
    """
    if avail_obs:
        primary = avail_obs[0]
        claim = (primary.get("published_claim") or "").lower()
        scope = primary.get("claim_scope") or "Published channel scope"
        qty = primary.get("website_reported_quantity")
        obs_at = primary.get("observed_at")
        if "on_order" in claim:
            state = "On order"
        elif "out_of_stock" in claim and any("available" in (a.get("published_claim") or "").lower() for a in avail_obs):
            state = "Check branch"
        elif "out_of_stock" in claim:
            state = "Reported out of stock"
        elif "available" in claim:
            state = "Reported available"
        else:
            state = "Check branch"
        return {
            "state": state,
            "claim_as_published": primary.get("published_claim"),
            "scope": scope,
            "reported_quantity": qty,
            "observed_at": obs_at,
            "is_live_inventory": False,
            "observations": avail_obs,
        }

    st = (stock_status or "unknown").strip().lower()
    if st in ("in_stock", "available", "reported_available", "reported_available_unconfirmed"):
        state = "Reported available"
    elif st in ("out_of_stock", "reported_out_of_stock"):
        state = "Reported out of stock"
    elif st in ("on_order", "available_on_order", "backorder"):
        state = "On order"
    elif st in ("check_branch", "branch_dependent", "varies_by_branch"):
        state = "Check branch"
    else:
        state = "Stock unknown"

    return {
        "state": state,
        "claim_as_published": st,
        "scope": "No live inventory connection; confirm stock with branch or supplier",
        "reported_quantity": None,
        "observed_at": None,
        "is_live_inventory": False,
        "observations": [],
    }


def _category_matches_strict(supplier_cats: List[str], target_cat: str) -> bool:
    """
    Strict category matching that never conflates ready_mix, dry_concrete, raw cement,
    masonry_cement, cement_adhesive, floor_hardener, and repair_mortar.
    """
    t = _normalize_category_code(target_cat)
    norm_sup = [_normalize_category_code(c) for c in supplier_cats]
    if t in ("all", ""):
        return True
    if t in norm_sup:
        return True
    if t in ("fine_aggregate", "sand") and ("sand" in norm_sup or "aggregates" in norm_sup or "fine_aggregate" in norm_sup):
        return True
    if t == "coarse_aggregate" and ("aggregates" in norm_sup or "coarse_aggregate" in norm_sup):
        return True
    if t == "aggregates" and ("aggregates" in norm_sup or "sand" in norm_sup or "fine_aggregate" in norm_sup or "coarse_aggregate" in norm_sup):
        return True
    if t in ("blast_furnace_slag", "fly_ash", "scm") and ("scm" in norm_sup or t in norm_sup):
        return True
    if t in ("superplasticizer", "admixtures") and ("admixtures" in norm_sup or "superplasticizer" in norm_sup):
        return True
    return False


def _price_category_matches_strict(price_cat: str, target_cat: str) -> bool:
    p = _normalize_category_code(price_cat)
    t = _normalize_category_code(target_cat)
    if t in ("all", ""):
        return True
    if p == t:
        return True
    if t in ("fine_aggregate", "sand") and p in ("fine_aggregate", "sand"):
        return True
    if t == "coarse_aggregate" and p in ("coarse_aggregate", "aggregates"):
        return True
    if t == "aggregates" and p in ("aggregates", "sand", "fine_aggregate", "coarse_aggregate"):
        return True
    if t in ("superplasticizer", "admixtures") and p in ("superplasticizer", "admixtures"):
        return True
    return False


def _evaluate_ingredient_price_snapshot(
    snap: Dict[str, Any],
    required_kg: Decimal,
    delivery_rule: Optional[Dict[str, Any]],
    distance_km: Optional[float],
) -> Dict[str, Any]:
    """
    Evaluate an ingredient price snapshot for a required mass in kg using Decimal arithmetic.
    Preserves price ranges, unresolved units, quantity tiers, customer tiers, payment terms,
    and product origin without inventing fees or exchange rates.
    """
    currency = snap["original_currency"]
    orig_unit = snap.get("original_unit")
    orig_amount_str = snap["original_amount"]
    amt_num = snap.get("amount_numeric")
    amt_min = snap.get("amount_min")
    amt_max = snap.get("amount_max")
    pack_kg = snap.get("pack_mass_kg")
    bulk_density = snap.get("bulk_density_kg_per_m3")
    q_min = snap.get("quantity_min")
    q_max = snap.get("quantity_max")
    cust_tier = snap.get("customer_tier") or "unspecified"
    pay_cond = snap.get("payment_condition")
    prod_origin = snap.get("product_origin_country")
    price_kind = snap.get("price_kind") or "public_catalog_snapshot"

    missing_components: List[str] = []
    notes: List[str] = []
    if snap.get("notes"):
        notes.append(snap["notes"])
    if snap.get("display_caveat") and snap.get("display_caveat") not in notes:
        notes.append(snap["display_caveat"])

    # Handle price range observations (e.g. Senegal eCephas EUR range and ISD market guide range)
    if amt_num is None and amt_min is not None and amt_max is not None:
        return {
            "price_id": snap["price_id"],
            "product_name": snap["product_name"],
            "product_category": snap["product_category"],
            "sku": snap.get("sku"),
            "source_grade": snap.get("source_grade"),
            "product_origin_country": prod_origin,
            "customer_tier": cust_tier,
            "payment_condition": pay_cond,
            "price_kind": price_kind,
            "currency": currency,
            "original_amount": orig_amount_str,
            "amount_min": amt_min,
            "amount_max": amt_max,
            "original_unit": orig_unit,
            "pack_mass_kg": pack_kg,
            "quantity_min": q_min,
            "quantity_max": q_max,
            "quantity_tier_matches_order": True,
            "required_kg": str(required_kg),
            "purchased_kg": None,
            "surplus_kg": None,
            "bags_needed": None,
            "material_subtotal": None,
            "delivery_fee": None,
            "vat_amount": None,
            "delivered_total": None,
            "reference_subtotal": None,
            "normalized_amount_per_kg": snap.get("normalized_amount_per_kg"),
            "is_complete_total": False,
            "quote_completeness": "price_range_observation",
            "missing_cost_components": ["exact_variant_or_supplier_quote", "delivery_fee", "tax_confirmation"],
            "notes": notes + [
                f"Published range ({amt_min}–{amt_max} {currency} per {orig_unit or 'unit'}); not ranked as a single fixed order offer."
            ],
        }

    if not orig_unit or amt_num is None:
        return {
            "price_id": snap["price_id"],
            "product_name": snap["product_name"],
            "product_category": snap["product_category"],
            "sku": snap.get("sku"),
            "source_grade": snap.get("source_grade"),
            "product_origin_country": prod_origin,
            "customer_tier": cust_tier,
            "payment_condition": pay_cond,
            "price_kind": price_kind,
            "currency": currency,
            "original_amount": orig_amount_str,
            "original_unit": None,
            "pack_mass_kg": pack_kg,
            "quantity_min": q_min,
            "quantity_max": q_max,
            "quantity_tier_matches_order": True,
            "required_kg": str(required_kg),
            "purchased_kg": None,
            "surplus_kg": None,
            "bags_needed": None,
            "material_subtotal": None,
            "delivery_fee": None,
            "vat_amount": None,
            "delivered_total": None,
            "reference_subtotal": None,
            "normalized_amount_per_kg": None,
            "is_complete_total": False,
            "quote_completeness": "unit_unconfirmed_snapshot",
            "missing_cost_components": ["unit_of_measure", "delivery_fee", "vat_confirmation"],
            "notes": notes + ["Unit of measure is unconfirmed on the source page; order total cannot be calculated."],
        }

    unit_price = to_decimal(orig_amount_str, "original_amount")
    u_norm = orig_unit.strip().lower()

    bags_needed: Optional[int] = None
    purchased_kg = required_kg
    surplus_kg = Decimal("0")
    material_subtotal: Optional[Decimal] = None

    try:
        if u_norm in ("bag", "50_kg_bag", "25_kg_bag") or pack_kg is not None:
            effective_pack = pack_kg if pack_kg is not None else 50.0
            bag_res = round_to_whole_bags(required_kg, effective_pack)
            bags_needed = bag_res.bags_needed
            purchased_kg = bag_res.purchased_kg
            surplus_kg = bag_res.surplus_kg
            material_subtotal = Decimal(bags_needed) * unit_price
            notes.append(
                f"Rounded {bag_res.required_kg} kg up to {bags_needed} whole bags "
                f"({bag_res.pack_size_kg} kg/bag) = {purchased_kg} kg purchased ({surplus_kg} kg surplus)."
            )
        elif u_norm in ("tonne", "metric_tonne", "t", "ton"):
            tonnes_qty = convert_quantity(required_kg, "kg", "tonne")
            material_subtotal = tonnes_qty * unit_price
        elif u_norm in ("short_ton", "us_short_ton"):
            st_qty = convert_quantity(required_kg, "kg", "short_ton")
            material_subtotal = st_qty * unit_price
        elif u_norm in ("long_ton", "uk_long_ton"):
            lt_qty = convert_quantity(required_kg, "kg", "long_ton")
            material_subtotal = lt_qty * unit_price
        elif u_norm in ("kg", "kilogram"):
            material_subtotal = required_kg * unit_price
        elif u_norm in ("lb", "pound"):
            lb_qty = convert_quantity(required_kg, "kg", "lb")
            material_subtotal = lb_qty * unit_price
        elif u_norm in ("m3", "m³", "yd3", "yd³"):
            vol_qty = convert_quantity(
                required_kg, "kg", u_norm, bulk_density_kg_per_m3=bulk_density
            )
            material_subtotal = vol_qty * unit_price
        else:
            missing_components.append(f"unsupported_unit:{orig_unit}")
    except MissingBulkDensityError as exc:
        return {
            "price_id": snap["price_id"],
            "product_name": snap["product_name"],
            "product_category": snap["product_category"],
            "currency": currency,
            "original_amount": orig_amount_str,
            "original_unit": orig_unit,
            "required_kg": str(required_kg),
            "purchased_kg": None,
            "surplus_kg": None,
            "bags_needed": None,
            "material_subtotal": None,
            "delivery_fee": None,
            "vat_amount": None,
            "delivered_total": None,
            "is_complete_total": False,
            "quote_completeness": "unit_conversion_blocked_missing_bulk_density",
            "missing_cost_components": ["bulk_density_kg_per_m3"],
            "notes": notes + [str(exc)],
        }
    except UnitConversionError as exc:
        missing_components.append(str(exc))

    if material_subtotal is None:
        return {
            "price_id": snap["price_id"],
            "product_name": snap["product_name"],
            "product_category": snap["product_category"],
            "currency": currency,
            "original_amount": orig_amount_str,
            "original_unit": orig_unit,
            "required_kg": str(required_kg),
            "purchased_kg": None,
            "surplus_kg": None,
            "bags_needed": None,
            "material_subtotal": None,
            "delivery_fee": None,
            "vat_amount": None,
            "delivered_total": None,
            "is_complete_total": False,
            "quote_completeness": "incomplete_conversion",
            "missing_cost_components": missing_components,
            "notes": notes,
        }

    # Check quantity tier eligibility against bags_needed (or unit count)
    tier_check_qty = bags_needed if bags_needed is not None else float(required_kg)
    tier_matches = True
    if q_min is not None and tier_check_qty < int(q_min):
        tier_matches = False
        notes.append(
            f"Bulk quantity tier requires minimum {q_min} {orig_unit or 'units'} "
            f"(requested order is {tier_check_qty} {orig_unit or 'units'})."
        )
    if q_max is not None and tier_check_qty > int(q_max):
        tier_matches = False
        notes.append(
            f"Quantity tier applies up to {q_max} {orig_unit or 'units'} "
            f"(requested order is {tier_check_qty} {orig_unit or 'units'})."
        )

    # Minimum order fee check
    min_order_fee = Decimal("0")
    if snap.get("min_order_fee") is not None:
        m_fee = to_decimal(snap["min_order_fee"], "min_order_fee")
        if material_subtotal < m_fee:
            min_order_fee = m_fee - material_subtotal
            notes.append(f"Minimum order top-up fee applied: {quantize_money(min_order_fee, currency)} {currency}.")

    # Delivery fee check (unknown fees remain None — never 0 by default!)
    deliv_inc = (snap.get("delivery_inclusion") or "unknown").lower()
    delivery_fee: Optional[Decimal] = None
    if deliv_inc in ("included", "delivered"):
        delivery_fee = Decimal("0")
        notes.append("Delivery is included in the quoted unit price (not added twice).")
    elif delivery_rule is not None and delivery_rule.get("currency", currency).upper() == currency.upper():
        d_fee = Decimal("0")
        has_rule = False
        if delivery_rule.get("fixed_delivery_fee") is not None:
            d_fee += to_decimal(delivery_rule["fixed_delivery_fee"])
            has_rule = True
        if delivery_rule.get("per_km_rate") is not None:
            if distance_km is not None:
                d_fee += to_decimal(distance_km) * to_decimal(delivery_rule["per_km_rate"])
                has_rule = True
            else:
                missing_components.append("delivery_distance_km")
        if delivery_rule.get("free_delivery_threshold") is not None:
            thresh = to_decimal(delivery_rule["free_delivery_threshold"])
            if material_subtotal >= thresh:
                d_fee = Decimal("0")
                has_rule = True
        if has_rule:
            delivery_fee = d_fee
        else:
            missing_components.append("delivery_fee")
    else:
        missing_components.append("delivery_fee")

    # Tax / VAT check
    tax_inc = snap.get("tax_included")
    vat_rate_str = snap.get("vat_rate_pct")
    vat_amount: Optional[Decimal] = None
    base_plus_deliv = material_subtotal + min_order_fee + (delivery_fee or Decimal("0"))

    if tax_inc == 1 or tax_inc is True:
        vat_amount = Decimal("0")
        delivered_total_dec = base_plus_deliv
        notes.append("Published price includes tax/VAT.")
    elif tax_inc == 0 or tax_inc is False:
        if vat_rate_str is not None:
            rate = to_decimal(vat_rate_str) / Decimal("100")
            vat_amount = base_plus_deliv * rate
            delivered_total_dec = base_plus_deliv + vat_amount
        else:
            vat_amount = None
            delivered_total_dec = base_plus_deliv
            missing_components.append("vat_rate_pct")
    else:
        vat_amount = None
        delivered_total_dec = base_plus_deliv
        missing_components.append("vat_confirmation")

    if not snap.get("is_live") and not snap.get("eligible_for_cheapest"):
        if "supplier_quote_confirmation" not in missing_components:
            missing_components.append("supplier_quote_confirmation")

    is_complete = len(missing_components) == 0 and bool(snap.get("eligible_for_cheapest"))

    return {
        "price_id": snap["price_id"],
        "product_name": snap["product_name"],
        "product_category": snap["product_category"],
        "sku": snap.get("sku"),
        "source_grade": snap.get("source_grade"),
        "product_origin_country": prod_origin,
        "customer_tier": cust_tier,
        "payment_condition": pay_cond,
        "price_kind": price_kind,
        "currency": currency,
        "original_amount": orig_amount_str,
        "original_unit": orig_unit,
        "pack_mass_kg": pack_kg,
        "quantity_min": q_min,
        "quantity_max": q_max,
        "quantity_tier_matches_order": tier_matches,
        "required_kg": str(required_kg.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "purchased_kg": str(purchased_kg.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "surplus_kg": str(surplus_kg.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "bags_needed": bags_needed,
        "material_subtotal": str(quantize_money(material_subtotal, currency)),
        "delivery_fee": str(quantize_money(delivery_fee, currency)) if delivery_fee is not None else None,
        "vat_amount": str(quantize_money(vat_amount, currency)) if vat_amount is not None else None,
        "delivered_total": str(quantize_money(delivered_total_dec, currency)) if is_complete else None,
        "reference_subtotal": str(quantize_money(delivered_total_dec, currency)),
        "normalized_amount_per_kg": snap.get("normalized_amount_per_kg"),
        "is_complete_total": is_complete,
        "quote_completeness": "confirmed_complete" if is_complete else "published_snapshot_estimate",
        "missing_cost_components": missing_components,
        "notes": notes,
    }


def _format_branch_record(
    br: Dict[str, Any],
    origin_lat: Optional[float],
    origin_lon: Optional[float],
    router_adapter: RoutingAdapter,
    city_filter_norm: str,
) -> Dict[str, Any]:
    loc_role = br.get("location_role") or "retail_branch"
    is_walk_in = loc_role in WALK_IN_RETAIL_ROLES and bool(br.get("retail_access_claimed", 1))
    role_label = (
        f"Retail / Distributor Outlet ({loc_role.replace('_', ' ')})"
        if is_walk_in
        else f"Office / Plant / Contact ({loc_role.replace('_', ' ')} — not a walk-in pickup store)"
    )

    dist_km: Optional[float] = None
    dist_label = "No verified store coordinates (kept in list)"
    if (
        origin_lat is not None
        and origin_lon is not None
        and br.get("latitude") is not None
        and br.get("longitude") is not None
        and br.get("eligible_for_nearest")
    ):
        d_res = router_adapter.calculate_distance(
            origin_lat, origin_lon, float(br["latitude"]), float(br["longitude"])
        )
        dist_km = d_res.distance_km
        dist_label = d_res.label

    br_city = br.get("city") or ""
    city_matches = bool(
        city_filter_norm
        and (
            normalize_location_text(br_city) == city_filter_norm
            or city_filter_norm in normalize_location_text(br_city)
            or city_filter_norm in normalize_location_text(br.get("address_text") or br.get("address") or "")
        )
    )

    try:
        s_urls = json.loads(br.get("source_urls_json") or "[]")
    except Exception:
        s_urls = []
    try:
        cats = json.loads(br.get("product_categories_json") or "[]")
    except Exception:
        cats = []

    return {
        "branch_id": br["branch_id"],
        "supplier_id": br.get("supplier_id"),
        "country_code": br["country_code"],
        "display_name": br.get("display_name") or br.get("branch_name"),
        "brand": br.get("brand"),
        "city": br_city,
        "address_text": br.get("address_text") or br.get("address"),
        "phone_e164": br.get("phone_e164") or br.get("phone"),
        "opening_hours": br.get("opening_hours"),
        "location_role": loc_role,
        "location_role_label": role_label,
        "is_walk_in_retail_outlet": is_walk_in,
        "latitude": br.get("latitude"),
        "longitude": br.get("longitude"),
        "coordinate_kind": br.get("coordinate_kind"),
        "geocode_status": br.get("geocode_status", "not_geocoded"),
        "eligible_for_nearest": bool(br.get("eligible_for_nearest")),
        "distance_km": dist_km,
        "distance_label": dist_label,
        "city_matches_query": city_matches,
        "stock_status": br.get("stock_status", "unknown"),
        "stock_quantity": br.get("stock_quantity"),
        "source_checked_at": br.get("source_checked_at"),
        "source_url": s_urls[0] if s_urls else None,
        "product_categories": cats,
        "notes": br.get("notes") or "Confirm branch stock, walk-in access, and current pricing before travel.",
    }


def search_market(
    tab: str = "ingredients",
    country_code: Optional[str] = None,
    category: Optional[str] = None,
    quantity: Any = None,
    unit: Optional[str] = None,
    basket_items: Optional[List[Dict[str, Any]]] = None,
    volume_m3: Any = None,
    strength_class: Optional[str] = None,
    needs_pump: bool = False,
    location_query: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    locality_id: Optional[str] = None,
    manual_location_entry: bool = False,
    sort_by: str = "recommended",
    price_filter: str = "all",
    page: int = 1,
    page_size: int = 25,
    recommended_weights: Optional[Dict[str, float]] = None,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Search and compare suppliers, branches, and published price observations across all 50 refreshed
    markets (and 100 locality-supported countries).
    Never silently broadens to another country or hides quote-only suppliers without explanation.
    """
    ensure_market_seeded(db_path)
    tab_norm = (tab or "ingredients").strip().lower()
    if tab_norm not in ("ingredients", "ready_mix", "all"):
        raise ValueError("tab must be 'ingredients', 'ready_mix', or 'all'.")

    raw_sort = (sort_by or "recommended").strip().lower()
    sort_aliases = {
        "recommended": "recommended",
        "recommended_for_filters": "recommended",
        "lowest_published_price": "lowest_published_price",
        "lowest_delivered_total": "lowest_published_price",
        "nearest_mapped_store": "nearest_mapped_store",
        "nearest": "nearest_mapped_store",
        "highest_reviewed": "highest_reviewed",
    }
    if raw_sort not in sort_aliases:
        raise ValueError(
            "sort_by must be one of: 'recommended', 'lowest_published_price', "
            "'lowest_delivered_total', 'nearest_mapped_store', 'nearest', 'highest_reviewed'."
        )
    sort_mode = sort_aliases[raw_sort]

    p_filter = (price_filter or "all").strip().lower()
    if p_filter not in ("all", "published_prices_only"):
        raise ValueError("price_filter must be 'all' or 'published_prices_only'.")

    page_num = max(1, int(page or 1))
    p_size = max(1, min(100, int(page_size or 25)))

    effective_country = (country_code or "").upper().strip()
    if effective_country == "ALL":
        effective_country = ""

    geo = GeocodingAdapter().resolve_location(
        query=location_query,
        country_code=effective_country or None,
        latitude=latitude,
        longitude=longitude,
        locality_id=locality_id,
        manual_location_entry=manual_location_entry,
    )
    router_adapter = RoutingAdapter()
    city_filter_norm = normalize_location_text(geo.city or location_query or "")

    # Determine requested category & quantities
    requested_ingredients: Dict[str, Decimal] = {}
    effective_category = _normalize_category_code(
        "ready_mix" if tab_norm == "ready_mix" else (category or "cement")
    )
    if tab_norm == "all":
        effective_category = _normalize_category_code(category or "all")

    raw_vol = to_decimal(
        volume_m3 if volume_m3 is not None else (quantity if quantity is not None else 6.0),
        "volume_m3",
    )
    u_vol = (unit or "m3").strip().lower()
    if u_vol in ("yd3", "yd³", "cy", "cubic_yard"):
        order_volume_m3 = convert_quantity(raw_vol, "yd3", "m3")
    else:
        order_volume_m3 = raw_vol if raw_vol <= Decimal("500") else Decimal("6.0")

    if tab_norm == "ingredients" and basket_items:
        for item in basket_items:
            m_key = _normalize_category_code(item.get("material_key") or item.get("category") or "cement")
            req_kg = to_decimal(item.get("required_kg", 0), "required_kg")
            if req_kg > Decimal("0"):
                requested_ingredients[m_key] = req_kg
    else:
        qty_val = to_decimal(quantity if quantity is not None else 1000, "quantity")
        u_val = (unit or "kg").strip().lower()
        if u_val in ("m3", "m³", "yd3", "yd³"):
            req_kg = qty_val * Decimal("1000")
        else:
            req_kg = convert_quantity(
                qty_val,
                u_val,
                "kg",
                pack_size_kg=DEFAULT_BAG_SIZES_KG.get(effective_category, 50),
            )
        requested_ingredients[effective_category] = req_kg

    conn = get_connection(db_path)
    try:
        sources_rows = conn.execute("SELECT * FROM sources").fetchall()
        sources_map = {r["source_id"]: dict(r) for r in sources_rows}

        if effective_country:
            country_meta_row = conn.execute(
                "SELECT * FROM countries WHERE country_code = ?", (effective_country,)
            ).fetchone()
            suppliers_rows = conn.execute(
                "SELECT * FROM suppliers WHERE is_active = 1 AND country_code = ? ORDER BY display_name ASC",
                (effective_country,),
            ).fetchall()
            prices_rows = conn.execute(
                "SELECT * FROM price_snapshots WHERE is_active = 1 AND country_code = ?",
                (effective_country,),
            ).fetchall()
            benchmarks_rows = conn.execute(
                "SELECT * FROM benchmark_references WHERE country_code = ?",
                (effective_country,),
            ).fetchall()
            branches_rows = conn.execute(
                "SELECT * FROM branches WHERE is_active = 1 AND country_code = ?",
                (effective_country,),
            ).fetchall()
            avail_rows = conn.execute(
                "SELECT * FROM availability_observations WHERE is_active = 1 AND country_code = ?",
                (effective_country,),
            ).fetchall()
        else:
            country_meta_row = None
            suppliers_rows = conn.execute(
                "SELECT * FROM suppliers WHERE is_active = 1 ORDER BY country_code ASC, display_name ASC"
            ).fetchall()
            prices_rows = conn.execute(
                "SELECT * FROM price_snapshots WHERE is_active = 1"
            ).fetchall()
            benchmarks_rows = conn.execute(
                "SELECT * FROM benchmark_references"
            ).fetchall()
            branches_rows = conn.execute(
                "SELECT * FROM branches WHERE is_active = 1"
            ).fetchall()
            avail_rows = conn.execute(
                "SELECT * FROM availability_observations WHERE is_active = 1"
            ).fetchall()

        # Collect all available categories in this country so we can inform the user if a specific filter has 0 matches
        available_categories_in_country = sorted(
            {
                _normalize_category_code(c)
                for s in suppliers_rows
                for c in json.loads(s["product_categories_json"] or "[]")
            }
            | {_normalize_category_code(p["product_category"]) for p in prices_rows}
        )

        delivery_rows = conn.execute("SELECT * FROM delivery_rules WHERE is_active = 1").fetchall()
        delivery_by_supplier: Dict[str, Dict[str, Any]] = {
            r["supplier_id"]: dict(r) for r in delivery_rows
        }

        branches_by_supplier: Dict[str, List[Dict[str, Any]]] = {}
        independent_branches: List[Dict[str, Any]] = []
        all_formatted_branches: List[Dict[str, Any]] = []
        for br_row in branches_rows:
            br_dict = dict(br_row)
            fmt_br = _format_branch_record(
                br=br_dict,
                origin_lat=geo.latitude if geo.resolved else None,
                origin_lon=geo.longitude if geo.resolved else None,
                router_adapter=router_adapter,
                city_filter_norm=city_filter_norm,
            )
            all_formatted_branches.append(fmt_br)
            if br_dict.get("supplier_id"):
                branches_by_supplier.setdefault(br_dict["supplier_id"], []).append(fmt_br)
            else:
                independent_branches.append(fmt_br)

        avail_by_supplier: Dict[str, List[Dict[str, Any]]] = {}
        unassigned_avail: List[Dict[str, Any]] = []
        for av_row in avail_rows:
            av_dict = dict(av_row)
            if av_dict.get("supplier_id"):
                avail_by_supplier.setdefault(av_dict["supplier_id"], []).append(av_dict)
            else:
                unassigned_avail.append(av_dict)

        reviews_rows = conn.execute(
            """
            SELECT supplier_id,
                   COUNT(*) AS cnt,
                   AVG(overall_rating) AS avg_overall,
                   AVG(service_rating) AS avg_service,
                   AVG(material_rating) AS avg_material
            FROM reviews
            WHERE moderation_state = 'approved' AND verified_purchase = 1
            GROUP BY supplier_id
            """
        ).fetchall()
        reviews_by_supplier: Dict[str, Dict[str, Any]] = {
            r["supplier_id"]: dict(r) for r in reviews_rows
        }

        prices_by_supplier: Dict[str, List[Dict[str, Any]]] = {}
        for pr in prices_rows:
            prices_by_supplier.setdefault(pr["supplier_id"], []).append(dict(pr))

        evaluated_offers: List[Dict[str, Any]] = []

        for sup_row in suppliers_rows:
            sup = dict(sup_row)
            sup_id = sup["supplier_id"]
            sup_cats = [_normalize_category_code(c) for c in json.loads(sup.get("product_categories_json") or "[]")]
            sup_sources = [
                sources_map.get(sid, {"source_id": sid})
                for sid in json.loads(sup.get("source_ids_json") or "[]")
            ]
            sup_prices = prices_by_supplier.get(sup_id, [])
            deliv_rule = delivery_by_supplier.get(sup_id)
            sup_branches = branches_by_supplier.get(sup_id, [])
            sup_avail = avail_by_supplier.get(sup_id, [])
            rec_eligible = bool(sup.get("recommendation_eligible", 1))

            # Check category relevance strictly
            if tab_norm == "ready_mix":
                matching_prices = [p for p in sup_prices if _price_category_matches_strict(p["product_category"], "ready_mix")]
                if not matching_prices and not _category_matches_strict(sup_cats, "ready_mix"):
                    continue
            elif tab_norm == "ingredients" and basket_items:
                target_keys = list(requested_ingredients.keys())
                matching_prices = [
                    p for p in sup_prices
                    if any(_price_category_matches_strict(p["product_category"], k) for k in target_keys)
                ]
                has_cat = any(_category_matches_strict(sup_cats, k) for k in target_keys)
                if not matching_prices and not has_cat:
                    continue
            else:
                matching_prices = [
                    p for p in sup_prices
                    if _price_category_matches_strict(p["product_category"], effective_category)
                ]
                if not matching_prices and not _category_matches_strict(sup_cats, effective_category):
                    continue

            other_cat_prices = [
                {"price_id": p["price_id"], "product_name": p["product_name"], "category": p["product_category"]}
                for p in sup_prices
                if p not in matching_prices
            ]

            # Distance calculation (ONLY for verified branches/suppliers with coordinates and eligible_for_nearest)
            distance_km: Optional[float] = None
            distance_label = "Distance unavailable — no verified branch coordinates (kept in directory list)"
            distance_mode: Optional[str] = None

            if geo.resolved and geo.latitude is not None and geo.longitude is not None:
                best_dist: Optional[RouteDistanceResult] = None
                for br in sup_branches:
                    if br.get("latitude") is not None and br.get("longitude") is not None and br.get("eligible_for_nearest"):
                        d_res = router_adapter.calculate_distance(
                            geo.latitude, geo.longitude, float(br["latitude"]), float(br["longitude"])
                        )
                        if best_dist is None or d_res.distance_km < best_dist.distance_km:
                            best_dist = d_res
                if (
                    best_dist is None
                    and sup.get("eligible_for_nearest")
                    and sup.get("latitude") is not None
                    and sup.get("longitude") is not None
                ):
                    best_dist = router_adapter.calculate_distance(
                        geo.latitude, geo.longitude, float(sup["latitude"]), float(sup["longitude"])
                    )
                if best_dist is not None:
                    distance_km = best_dist.distance_km
                    distance_label = best_dist.label
                    distance_mode = best_dist.distance_mode

            # Progressive discovery tier classification
            has_retail_branch = any(b.get("is_walk_in_retail_outlet") for b in sup_branches)
            has_city_match_branch = any(b.get("city_matches_query") for b in sup_branches)
            service_area_claim = (
                sup.get("delivery_area_confirmed")
                or sup.get("delivery_area")
                or next((p.get("service_area_claim") or p.get("location_context") for p in matching_prices if p.get("service_area_claim") or p.get("location_context")), None)
            )
            if has_retail_branch or has_city_match_branch:
                discovery_tier = "tier_1_local_branch"
                discovery_tier_label = "Local / Regional Branch Evidence (confirm branch stock vs network catalog)"
            elif service_area_claim:
                discovery_tier = "tier_2_service_area_supplier"
                discovery_tier_label = f"Published Service Area ({service_area_claim}) — delivery unconfirmed until checked for destination"
            else:
                discovery_tier = "tier_3_country_buying_channel"
                discovery_tier_label = "Country option — local availability and delivery to confirm"

            # Review metrics
            rev_stats = reviews_by_supplier.get(sup_id)
            rev_count = int(rev_stats["cnt"]) if rev_stats else 0
            mean_overall = round(float(rev_stats["avg_overall"]), 2) if rev_stats and rev_stats["avg_overall"] is not None else None
            mean_service = round(float(rev_stats["avg_service"]), 2) if rev_stats and rev_stats["avg_service"] is not None else None
            mean_material = round(float(rev_stats["avg_material"]), 2) if rev_stats and rev_stats["avg_material"] is not None else None
            bayesian_review = _compute_bayesian_review_score(rev_count, mean_overall)
            rev_summary = {
                "review_count": rev_count,
                "mean_overall_rating": mean_overall,
                "mean_service_rating": mean_service,
                "mean_material_rating": mean_material,
                "bayesian_score": bayesian_review,
                "label": f"{mean_overall:.1f} / 5 ({rev_count} verified reviews)" if rev_count > 0 and mean_overall else "No verified reviews yet",
            }

            avail_badge = _format_availability_badge(sup.get("stock_status") or sup.get("online_stock"), sup_avail)
            primary_phone = sup.get("phone_e164") or next((b.get("phone_e164") for b in sup_branches if b.get("phone_e164")), None)
            checked_date = sup.get("source_checked_at") or "2026-10-18"

            # Case A: Quote-only supplier for the requested category (0 matching price observations)
            if not matching_prices:
                sup_notes = [sup["notes"]] if sup.get("notes") else [
                    "Verified buying channel / quote contact; request a direct quotation for current pricing, stock, and delivery."
                ]
                if other_cat_prices:
                    other_cats_str = ", ".join(sorted({p["category"] for p in other_cat_prices}))
                    sup_notes.append(
                        f"Note: Published price observations for this merchant exist in separate category ({other_cats_str}), not mixed into '{effective_category}'."
                    )
                evaluated_offers.append({
                    "supplier_id": sup_id,
                    "display_name": sup["display_name"],
                    "country_code": sup["country_code"],
                    "record_type": sup["record_type"],
                    "commercial_status": sup["commercial_status"],
                    "recommendation_eligible": rec_eligible,
                    "discovery_tier": discovery_tier,
                    "discovery_tier_label": discovery_tier_label,
                    "service_area_claim": service_area_claim,
                    "product_categories_confirmed": sup_cats,
                    "other_category_observations": other_cat_prices,
                    "source_url": sup.get("website_or_directory_url") or sup.get("source_url"),
                    "phone_e164": primary_phone,
                    "source_checked_at": checked_date,
                    "sources": sup_sources,
                    "branches": sup_branches,
                    "availability": avail_badge,
                    "distance_km": distance_km,
                    "distance_label": distance_label,
                    "distance_mode": distance_mode,
                    "review_summary": rev_summary,
                    "quote_completeness": "directory_lead_no_price",
                    "is_complete_total": False,
                    "currency": None,
                    "delivered_total": None,
                    "reference_subtotal": None,
                    "missing_cost_components": ["unit_price", "delivery_fee", "vat_confirmation"],
                    "covered_basket_items": 0,
                    "requested_basket_items": len(requested_ingredients),
                    "line_items": [],
                    "dispatch_breakdown": None,
                    "freshness": {"score": 0.3, "label": f"Directory channel checked {checked_date} — request quote"},
                    "next_step": "Open supplier catalog/contact page or call branch to request a quote.",
                    "notes": sup_notes,
                })
                continue

            # Case B: Multi-item Mix Lab basket mode
            if tab_norm == "ingredients" and basket_items and len(requested_ingredients) > 1:
                target_keys = list(requested_ingredients.keys())
                line_items: List[Dict[str, Any]] = []
                covered_keys: List[str] = []
                missing_keys: List[str] = []
                combined_missing_comps: List[str] = []
                currency_used: Optional[str] = None
                subtotal_accum = Decimal("0")
                all_lines_complete = True
                best_f_score = 0.0
                best_f_label = "Published snapshot"

                for m_key in target_keys:
                    req_kg = requested_ingredients[m_key]
                    cat_snaps = [p for p in matching_prices if _price_category_matches_strict(p["product_category"], m_key)]
                    if not cat_snaps:
                        missing_keys.append(m_key)
                        all_lines_complete = False
                        combined_missing_comps.append(f"missing_ingredient:{m_key}")
                        continue
                    snap = cat_snaps[0]
                    f_score, f_label = _freshness_score_and_label(
                        snap.get("observed_at"), snap.get("supplier_confirmed_at"), bool(snap.get("is_live")), snap.get("source_effective_at")
                    )
                    if f_score > best_f_score:
                        best_f_score = f_score
                        best_f_label = f_label

                    eval_line = _evaluate_ingredient_price_snapshot(
                        snap=snap,
                        required_kg=req_kg,
                        delivery_rule=deliv_rule,
                        distance_km=distance_km,
                    )
                    line_items.append(eval_line)
                    covered_keys.append(m_key)
                    currency_used = eval_line["currency"]
                    if eval_line.get("reference_subtotal") is not None:
                        subtotal_accum += to_decimal(eval_line["reference_subtotal"])
                    if not eval_line["is_complete_total"]:
                        all_lines_complete = False
                    for mc in eval_line.get("missing_cost_components", []):
                        if mc not in combined_missing_comps:
                            combined_missing_comps.append(mc)

                is_basket_complete = (
                    all_lines_complete
                    and len(missing_keys) == 0
                    and len(combined_missing_comps) == 0
                )
                completeness_state = (
                    "confirmed_complete"
                    if is_basket_complete
                    else (
                        "partial_basket_estimate"
                        if len(missing_keys) > 0
                        else "published_snapshot_estimate"
                    )
                )
                first_snap = matching_prices[0]
                evaluated_offers.append({
                    "supplier_id": sup_id,
                    "price_id": first_snap["price_id"],
                    "display_name": sup["display_name"],
                    "product_name": ", ".join(li["product_name"] for li in line_items),
                    "product_category": first_snap["product_category"],
                    "country_code": sup["country_code"],
                    "record_type": sup["record_type"],
                    "commercial_status": sup["commercial_status"],
                    "recommendation_eligible": rec_eligible,
                    "discovery_tier": discovery_tier,
                    "discovery_tier_label": discovery_tier_label,
                    "service_area_claim": service_area_claim,
                    "price_status": first_snap["price_status"],
                    "product_categories_confirmed": sup_cats,
                    "source_url": first_snap.get("source_url") or sup.get("website_or_directory_url") or sup.get("source_url"),
                    "phone_e164": primary_phone,
                    "source_checked_at": first_snap.get("observed_at") or checked_date,
                    "sources": sup_sources,
                    "branches": sup_branches,
                    "availability": avail_badge,
                    "distance_km": distance_km,
                    "distance_label": distance_label,
                    "distance_mode": distance_mode,
                    "review_summary": rev_summary,
                    "quote_completeness": completeness_state,
                    "is_complete_total": is_basket_complete,
                    "currency": currency_used,
                    "original_amount": first_snap["original_amount"] if len(line_items) == 1 else None,
                    "original_unit": first_snap["original_unit"] if len(line_items) == 1 else "basket",
                    "delivered_total": str(quantize_money(subtotal_accum, currency_used or "USD")) if is_basket_complete else None,
                    "reference_subtotal": str(quantize_money(subtotal_accum, currency_used or "USD")) if currency_used and subtotal_accum > Decimal("0") else None,
                    "missing_cost_components": combined_missing_comps,
                    "covered_basket_items": len(covered_keys),
                    "requested_basket_items": len(target_keys),
                    "missing_basket_items": missing_keys,
                    "line_items": line_items,
                    "freshness": {"score": best_f_score, "label": best_f_label},
                    "next_step": "Verify current price, missing basket ingredients, and delivery with supplier.",
                    "notes": [n for li in line_items for n in li.get("notes", [])],
                })
                continue

            # Case C: Single-category or 'all' evaluation — evaluate each matching price observation
            snaps_to_eval = matching_prices
            if strength_class and (tab_norm == "ready_mix" or effective_category == "ready_mix"):
                sc_lower = strength_class.strip().lower()
                filtered_rm = [
                    p for p in snaps_to_eval
                    if sc_lower in p["product_name"].lower() or sc_lower in (p.get("source_grade") or "").lower()
                ]
                if filtered_rm:
                    snaps_to_eval = filtered_rm

            for snap in snaps_to_eval:
                p_cat = _normalize_category_code(snap["product_category"])
                f_score, f_label = _freshness_score_and_label(
                    snap.get("observed_at"),
                    snap.get("supplier_confirmed_at"),
                    bool(snap.get("is_live")),
                    snap.get("source_effective_at"),
                )
                snap_sources = [
                    sources_map.get(sid, {"source_id": sid})
                    for sid in json.loads(snap.get("source_ids_json") or "[]")
                ] or sup_sources

                if p_cat == "ready_mix":
                    orig_unit = snap.get("original_unit")
                    if not orig_unit or snap.get("amount_numeric") is None:
                        evaluated_offers.append({
                            "supplier_id": sup_id,
                            "price_id": snap["price_id"],
                            "display_name": sup["display_name"],
                            "product_name": snap["product_name"],
                            "product_category": p_cat,
                            "source_grade": snap.get("source_grade"),
                            "country_code": sup["country_code"],
                            "record_type": sup["record_type"],
                            "commercial_status": sup["commercial_status"],
                            "recommendation_eligible": rec_eligible,
                            "discovery_tier": discovery_tier,
                            "discovery_tier_label": discovery_tier_label,
                            "service_area_claim": snap.get("service_area_claim") or service_area_claim,
                            "price_status": snap["price_status"],
                            "price_kind": snap.get("price_kind"),
                            "product_categories_confirmed": sup_cats,
                            "source_url": snap.get("source_url") or sup.get("website_or_directory_url") or sup.get("source_url"),
                            "phone_e164": primary_phone,
                            "source_checked_at": snap.get("observed_at") or checked_date,
                            "sources": snap_sources,
                            "branches": sup_branches,
                            "availability": avail_badge,
                            "distance_km": distance_km,
                            "distance_label": distance_label,
                            "distance_mode": distance_mode,
                            "review_summary": rev_summary,
                            "quote_completeness": "unit_unconfirmed_snapshot",
                            "is_complete_total": False,
                            "currency": snap["original_currency"],
                            "original_amount": snap["original_amount"],
                            "original_unit": None,
                            "normalized_price_per_m3": None,
                            "delivered_total": None,
                            "reference_subtotal": None,
                            "quantity_tier_matches_order": True,
                            "missing_cost_components": ["unit_of_measure", "delivery_fee", "vat_confirmation"],
                            "line_items": [],
                            "dispatch_breakdown": None,
                            "freshness": {"score": f_score, "label": f_label},
                            "next_step": "Confirm volume unit (e.g. per m³), tax, pump fees, and delivery directly with producer.",
                            "notes": [
                                f"Published amount: {snap['original_amount']} {snap['original_currency']} (volume unit not explicitly stated in concrete price table; excluded from normalized price/m³ ranking).",
                                snap.get("notes") or snap.get("display_caveat") or "",
                            ],
                        })
                        continue

                    u_orig = orig_unit.strip().lower()
                    raw_price = to_decimal(snap["original_amount"])
                    if u_orig in ("yd3", "yd³", "cubic_yard"):
                        price_per_m3 = raw_price / Decimal("0.764554857984")
                    else:
                        price_per_m3 = raw_price

                    deliv_inc = (snap.get("delivery_inclusion") or "unknown").lower()
                    deliv_status = "delivered" if "included" in deliv_inc or deliv_inc == "delivered" else "ex_works"
                    tax_inc = snap.get("tax_included")
                    vat_status = "inc_vat" if tax_inc == 1 else ("ex_vat" if tax_inc == 0 else "unspecified")

                    dispatch = calculate_ready_mix_order(
                        volume_m3=order_volume_m3,
                        unit_price_per_m3=price_per_m3,
                        currency=snap["original_currency"],
                        vat_status=vat_status,
                        vat_rate_pct=snap.get("vat_rate_pct"),
                        delivery_status=deliv_status,
                        truck_capacity_m3=deliv_rule["truck_capacity_m3"] if deliv_rule and deliv_rule.get("truck_capacity_m3") else Decimal("8.0"),
                        min_load_m3=deliv_rule["min_load_m3"] if deliv_rule and deliv_rule.get("min_load_m3") else Decimal("0"),
                        small_load_fee=deliv_rule.get("small_load_fee") if deliv_rule else None,
                        underload_fee_per_m3=deliv_rule.get("underload_fee_per_m3") if deliv_rule else None,
                        fixed_delivery_fee_per_truck=deliv_rule.get("fixed_delivery_fee") if deliv_rule else None,
                        per_km_rate_per_truck=deliv_rule.get("per_km_rate") if deliv_rule else None,
                        distance_km=distance_km,
                        needs_pump=needs_pump,
                        pump_fixed_fee=deliv_rule.get("pump_fixed_fee") if deliv_rule else None,
                        pump_per_m3_fee=deliv_rule.get("pump_per_m3_fee") if deliv_rule else None,
                    )

                    missing_comps = list(dispatch.missing_components)
                    if not snap.get("eligible_for_cheapest") and "supplier_quote_confirmation" not in missing_comps:
                        missing_comps.append("supplier_quote_confirmation")
                    is_complete = len(missing_comps) == 0 and bool(snap.get("eligible_for_cheapest"))

                    extra_notes = []
                    if snap.get("air_entrainment"):
                        extra_notes.append(f"Air entrainment: {snap['air_entrainment']}.")
                    if snap.get("intended_use_claim"):
                        extra_notes.append(f"Intended use: {snap['intended_use_claim']}.")
                    if snap.get("notes"):
                        extra_notes.append(snap["notes"])

                    evaluated_offers.append({
                        "supplier_id": sup_id,
                        "price_id": snap["price_id"],
                        "display_name": sup["display_name"],
                        "product_name": snap["product_name"],
                        "product_category": p_cat,
                        "source_grade": snap.get("source_grade"),
                        "air_entrainment": snap.get("air_entrainment"),
                        "intended_use_claim": snap.get("intended_use_claim"),
                        "country_code": sup["country_code"],
                        "record_type": sup["record_type"],
                        "commercial_status": sup["commercial_status"],
                        "recommendation_eligible": rec_eligible,
                        "discovery_tier": discovery_tier,
                        "discovery_tier_label": discovery_tier_label,
                        "service_area_claim": snap.get("service_area_claim") or service_area_claim,
                        "price_status": snap["price_status"],
                        "price_kind": snap.get("price_kind"),
                        "product_categories_confirmed": sup_cats,
                        "source_url": snap.get("source_url") or sup.get("website_or_directory_url") or sup.get("source_url"),
                        "phone_e164": primary_phone,
                        "source_checked_at": snap.get("observed_at") or checked_date,
                        "source_effective_at": snap.get("source_effective_at"),
                        "sources": snap_sources,
                        "branches": sup_branches,
                        "availability": avail_badge,
                        "distance_km": distance_km,
                        "distance_label": distance_label,
                        "distance_mode": distance_mode,
                        "review_summary": rev_summary,
                        "quote_completeness": "confirmed_complete" if is_complete else "published_snapshot_estimate",
                        "is_complete_total": is_complete,
                        "currency": dispatch.currency,
                        "original_amount": snap["original_amount"],
                        "original_unit": orig_unit,
                        "normalized_price_per_m3": str(quantize_money(price_per_m3, dispatch.currency)),
                        "delivered_total": str(dispatch.total_inc_vat) if is_complete else None,
                        "reference_subtotal": str(dispatch.total_inc_vat),
                        "quantity_tier_matches_order": True,
                        "missing_cost_components": missing_comps,
                        "dispatch_breakdown": {
                            "ordered_volume_m3": str(dispatch.ordered_volume_m3),
                            "truck_capacity_m3": str(dispatch.truck_capacity_m3),
                            "truck_count": dispatch.truck_count,
                            "load_volumes_m3": [str(x) for x in dispatch.load_volumes_m3],
                            "base_material_subtotal": str(dispatch.base_material_subtotal),
                            "small_load_fee": str(dispatch.small_load_fee),
                            "delivery_fee": str(dispatch.delivery_fee),
                            "pump_fee": str(dispatch.pump_fee),
                            "subtotal_ex_vat": str(dispatch.subtotal_ex_vat),
                            "vat_amount": str(dispatch.vat_amount),
                            "total_inc_vat": str(dispatch.total_inc_vat),
                        },
                        "line_items": [],
                        "freshness": {"score": f_score, "label": f_label},
                        "next_step": "Confirm delivery zone, truck access, environmental/load surcharges, and taxes with batching plant.",
                        "notes": dispatch.notes + extra_notes,
                    })
                else:
                    req_kg = requested_ingredients.get(effective_category, Decimal("1000"))
                    eval_line = _evaluate_ingredient_price_snapshot(
                        snap=snap,
                        required_kg=req_kg,
                        delivery_rule=deliv_rule,
                        distance_km=distance_km,
                    )
                    evaluated_offers.append({
                        "supplier_id": sup_id,
                        "price_id": snap["price_id"],
                        "display_name": sup["display_name"],
                        "product_name": snap["product_name"],
                        "product_category": p_cat,
                        "sku": snap.get("sku"),
                        "source_grade": snap.get("source_grade"),
                        "product_origin_country": snap.get("product_origin_country"),
                        "customer_tier": snap.get("customer_tier") or "unspecified",
                        "payment_condition": snap.get("payment_condition"),
                        "quantity_min": snap.get("quantity_min"),
                        "quantity_max": snap.get("quantity_max"),
                        "quantity_tier_matches_order": eval_line.get("quantity_tier_matches_order", True),
                        "quantity_tier_matched": eval_line.get("quantity_tier_matches_order", True),
                        "country_code": sup["country_code"],
                        "record_type": sup["record_type"],
                        "commercial_status": sup["commercial_status"],
                        "recommendation_eligible": rec_eligible,
                        "discovery_tier": discovery_tier,
                        "discovery_tier_label": discovery_tier_label,
                        "service_area_claim": snap.get("service_area_claim") or service_area_claim,
                        "price_status": snap["price_status"],
                        "price_kind": snap.get("price_kind"),
                        "product_categories_confirmed": sup_cats,
                        "source_url": snap.get("source_url") or sup.get("website_or_directory_url") or sup.get("source_url"),
                        "phone_e164": primary_phone,
                        "source_checked_at": snap.get("observed_at") or checked_date,
                        "source_effective_at": snap.get("source_effective_at"),
                        "sources": snap_sources,
                        "branches": sup_branches,
                        "availability": avail_badge,
                        "distance_km": distance_km,
                        "distance_label": distance_label,
                        "distance_mode": distance_mode,
                        "review_summary": rev_summary,
                        "quote_completeness": eval_line["quote_completeness"],
                        "is_price_range": eval_line["quote_completeness"] == "price_range_observation",
                        "is_complete_total": eval_line["is_complete_total"],
                        "currency": eval_line["currency"],
                        "original_currency": snap["original_currency"],
                        "original_amount": snap["original_amount"],
                        "amount_min": snap.get("amount_min"),
                        "amount_max": snap.get("amount_max"),
                        "original_unit": snap["original_unit"],
                        "pack_mass_kg": snap.get("pack_mass_kg"),
                        "normalized_price_per_kg": str(snap["normalized_amount_per_kg"]) if snap.get("normalized_amount_per_kg") is not None else None,
                        "delivered_total": eval_line["delivered_total"],
                        "reference_subtotal": eval_line.get("reference_subtotal"),
                        "missing_cost_components": eval_line["missing_cost_components"],
                        "covered_basket_items": 1,
                        "requested_basket_items": 1,
                        "missing_basket_items": [],
                        "line_items": [eval_line],
                        "freshness": {"score": f_score, "label": f_label},
                        "next_step": "Verify current price, quantity tier, tax, stock, and delivery fees on merchant page.",
                        "notes": eval_line["notes"],
                    })

        # Compute Recommended composite scores and sort offers
        ranked_offers, sorting_metadata = _rank_and_explain_offers(
            offers=evaluated_offers,
            sort_mode=sort_mode,
            weights_override=recommended_weights,
        )

        # Apply optional price_filter while explicitly explaining excluded quote-only channels
        quote_only_count = sum(1 for o in ranked_offers if o.get("quote_completeness") == "directory_lead_no_price")
        if p_filter == "published_prices_only":
            filtered_offers = [o for o in ranked_offers if o.get("quote_completeness") != "directory_lead_no_price"]
            price_filter_explanation = (
                f"Showing {len(filtered_offers)} published price observation(s). "
                f"Hiding {quote_only_count} quote-only buying channel(s) that require direct supplier quotation. "
                "Switch filter to 'All channels (include quote-only)' to view all buying options."
            )
        else:
            filtered_offers = ranked_offers
            price_filter_explanation = (
                f"Showing all {len(filtered_offers)} matching channels ({len(filtered_offers) - quote_only_count} with published price observations, "
                f"{quote_only_count} quote-only channels)."
            )

        # Pagination calculation
        total_results = len(filtered_offers)
        total_pages = max(1, (total_results + p_size - 1) // p_size)
        curr_page = min(page_num, total_pages)
        start_idx = (curr_page - 1) * p_size
        end_idx = start_idx + p_size
        paginated_offers = filtered_offers[start_idx:end_idx]

        # Build progressive discovery sections for the country/material
        matching_branches = [
            b for b in all_formatted_branches
            if not b.get("product_categories")
            or _category_matches_strict(b["product_categories"], effective_category)
        ]
        matching_branches.sort(
            key=lambda b: (
                0 if b.get("city_matches_query") else 1,
                0 if b.get("is_walk_in_retail_outlet") else 1,
                float(b["distance_km"]) if b.get("distance_km") is not None else float("inf"),
                b.get("display_name") or "",
            )
        )

        mapped_branch_pins = [
            b for b in all_formatted_branches
            if b.get("latitude") is not None and b.get("longitude") is not None and b.get("eligible_for_nearest")
        ]
        unmapped_branch_count = len(all_formatted_branches) - len(mapped_branch_pins)
        unmapped_offer_count = sum(1 for o in filtered_offers if o.get("distance_km") is None)

        # Format government benchmark references (strictly separated from supplier offers!)
        benchmarks_out = []
        for b_row in benchmarks_rows:
            b = dict(b_row)
            b_sources = [
                sources_map.get(sid, {"source_id": sid})
                for sid in json.loads(b.get("source_ids_json") or "[]")
            ]
            benchmarks_out.append({
                "benchmark_id": b["benchmark_id"],
                "country_code": b["country_code"],
                "product_name": b["product_name"],
                "amount": b["amount"],
                "currency": b["currency"],
                "unit": b["unit"],
                "record_type": b["record_type"],
                "badge": "Government cost schedule — NOT a supplier offer",
                "period": b["period"],
                "observed_at": b["observed_at"],
                "sources": b_sources,
                "notes": b["notes"],
            })

        country_summary = dict(country_meta_row) if country_meta_row else None
        if country_summary and "locales_json" in country_summary:
            try:
                country_summary["locales"] = json.loads(country_summary.pop("locales_json") or "[]")
            except Exception:
                country_summary["locales"] = []

        loc_dict = {
            "query": geo.query,
            "locality_id": geo.locality_id,
            "resolved": geo.resolved,
            "resolution_status": (
                "manual_unverified_text"
                if (manual_location_entry and not geo.resolved)
                else ("matched_locality" if geo.resolved else "unresolved")
            ),
            "city": geo.city,
            "latitude": geo.latitude,
            "longitude": geo.longitude,
            "provider": geo.provider,
            "note": geo.note,
            "attribution": GEONAMES_ATTRIBUTION,
        }

        return {
            "tab": tab_norm,
            "country_code": effective_country or "ALL",
            "country": country_summary,
            "country_summary": country_summary,
            "effective_category": effective_category,
            "available_categories_in_country": available_categories_in_country,
            "sort_by": sort_mode,
            "price_filter": p_filter,
            "price_filter_explanation": price_filter_explanation,
            "excluded_quote_only_count": quote_only_count if p_filter == "published_prices_only" else 0,
            "location": loc_dict,
            "resolved_location": loc_dict,
            "map_summary": {
                "verified_store_pin_count": len(mapped_branch_pins),
                "verified_store_pins": mapped_branch_pins,
                "unmapped_branch_count": unmapped_branch_count,
                "unmapped_offer_count": unmapped_offer_count,
                "policy_note": (
                    "Only verified address-matched physical branch coordinates are rendered as store pins. "
                    "GeoNames locality coordinates are search origins only, never substituted as shop pins."
                ),
            },
            "progressive_sections": {
                "local_branches_count": len(matching_branches),
                "walk_in_retail_branch_count": sum(1 for b in matching_branches if b.get("is_walk_in_retail_outlet")),
                "office_or_plant_contact_count": sum(1 for b in matching_branches if not b.get("is_walk_in_retail_outlet")),
                "local_branches": matching_branches,
                "unassigned_catalog_observations": [
                    _format_availability_badge(a.get("stock_status"), [a]) for a in unassigned_avail
                ],
            },
            "pagination": {
                "page": curr_page,
                "page_size": p_size,
                "total_results": total_results,
                "total_pages": total_pages,
                "has_next": curr_page < total_pages,
                "has_prev": curr_page > 1,
            },
            "sorting_metadata": sorting_metadata,
            "offers": filtered_offers,
            "paginated_offers": paginated_offers,
            "benchmark_references": benchmarks_out,
        }
    finally:
        conn.close()


def _rank_and_explain_offers(
    offers: List[Dict[str, Any]],
    sort_mode: str,
    weights_override: Optional[Dict[str, float]] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Apply transparent sorting & recommendation scoring with cohort weight renormalization
    and deterministic tie-breaking.
    Never labels any seed observation 'Cheapest delivered' and never gives every card a badge.
    """
    base_weights = {
        "cost": 0.65,
        "travel": 0.20,
        "reviews": 0.10,
        "freshness": 0.05,
    }
    if weights_override:
        for k in base_weights:
            if k in weights_override and weights_override[k] >= 0:
                base_weights[k] = float(weights_override[k])

    complete_offers = [
        o for o in offers
        if o.get("is_complete_total") and o.get("delivered_total") is not None and o.get("recommendation_eligible", True)
    ]
    snapshot_offers = [
        o for o in offers
        if not o.get("is_complete_total") and o.get("quote_completeness") != "directory_lead_no_price"
    ]
    directory_leads = [
        o for o in offers if o.get("quote_completeness") == "directory_lead_no_price"
    ]

    # Only compare costs within a single category + single currency cohort of tier-matching numeric snapshots
    comparable_snapshots = [
        o for o in snapshot_offers
        if o.get("reference_subtotal") is not None
        and o.get("quantity_tier_matches_order", True)
        and o.get("recommendation_eligible", True)
    ]
    scoring_pool = complete_offers if len(complete_offers) > 0 else comparable_snapshots
    currencies_in_pool = {o.get("currency") for o in scoring_pool if o.get("currency")}
    categories_in_pool = {o.get("product_category") for o in scoring_pool if o.get("product_category")}
    single_currency_and_category = len(currencies_in_pool) == 1 and len(categories_in_pool) <= 1

    has_cost = single_currency_and_category and any(
        (o.get("delivered_total") or o.get("reference_subtotal")) is not None for o in scoring_pool
    )
    has_travel = any(o.get("distance_km") is not None for o in scoring_pool)
    has_reviews = any(o["review_summary"]["review_count"] > 0 for o in scoring_pool)
    has_freshness = any(o.get("freshness", {}).get("score", 0.0) > 0 for o in scoring_pool)

    active_flags = {
        "cost": has_cost,
        "travel": has_travel,
        "reviews": has_reviews,
        "freshness": has_freshness,
    }
    raw_active_sum = sum(base_weights[k] for k, active in active_flags.items() if active)
    if raw_active_sum <= 0:
        active_weights = {"cost": 0.0, "travel": 0.0, "reviews": 0.0, "freshness": 1.0}
    else:
        active_weights = {
            k: round(base_weights[k] / raw_active_sum, 4) if active_flags[k] else 0.0
            for k in base_weights
        }

    costs = [
        float(o["delivered_total"] if o.get("delivered_total") is not None else o["reference_subtotal"])
        for o in scoring_pool
        if (o.get("delivered_total") or o.get("reference_subtotal")) is not None
    ]
    min_cost = min(costs) if costs else 0.0
    max_cost = max(costs) if costs else 0.0

    dists = [float(o["distance_km"]) for o in scoring_pool if o.get("distance_km") is not None]
    min_dist = min(dists) if dists else 0.0
    max_dist = max(dists) if dists else 0.0

    for o in offers:
        val_str = o.get("delivered_total") or o.get("reference_subtotal")
        c_val = float(val_str) if (val_str is not None and o.get("quantity_tier_matches_order", True)) else None
        if has_cost and c_val is not None:
            c_score = 1.0 if max_cost <= min_cost else (max_cost - c_val) / (max_cost - min_cost)
        else:
            c_score = 0.0

        d_val = o.get("distance_km")
        if has_travel and d_val is not None:
            d_score = 1.0 if max_dist <= min_dist else (max_dist - float(d_val)) / (max_dist - min_dist)
        else:
            d_score = 0.0

        b_rev = o["review_summary"].get("bayesian_score")
        if has_reviews and b_rev is not None:
            r_score = max(0.0, min(1.0, (float(b_rev) - 1.0) / 4.0))
        else:
            r_score = 0.0

        f_score = float(o.get("freshness", {}).get("score", 0.0))

        comp_score = (
            active_weights["cost"] * c_score
            + active_weights["travel"] * d_score
            + active_weights["reviews"] * r_score
            + active_weights["freshness"] * f_score
        )
        if not o.get("recommendation_eligible", True):
            comp_score = 0.0

        o["recommendation_breakdown"] = {
            "composite_score": round(comp_score, 4),
            "eligible_for_complete_recommendation": bool(o.get("is_complete_total") and o.get("recommendation_eligible", True)),
            "configured_weights": base_weights,
            "active_weights": active_weights,
            "components": {
                "cost_score": round(c_score, 4) if has_cost and c_val is not None else None,
                "travel_score": round(d_score, 4) if has_travel and d_val is not None else None,
                "review_score": round(r_score, 4) if has_reviews and b_rev is not None else None,
                "freshness_score": round(f_score, 4),
            },
        }

    # Assign status/recommendation badges honestly
    if len(complete_offers) == 1:
        complete_offers[0]["recommendation_badge"] = "Only matched offer"
        complete_offers[0]["recommendation_explanation"] = (
            "Labeled 'Only matched offer' because only 1 supplier in this cohort has a complete "
            "delivered total (never labeled 'Best value' without at least 2 complete comparable offers)."
        )
    elif len(complete_offers) > 1:
        complete_offers.sort(
            key=lambda x: (
                -x["recommendation_breakdown"]["composite_score"],
                Decimal(str(x["delivered_total"])),
                float(x["distance_km"]) if x.get("distance_km") is not None else float("inf"),
                -x["review_summary"]["review_count"],
                x["display_name"],
                x["supplier_id"],
            )
        )
        top = complete_offers[0]
        top["recommendation_badge"] = "Recommended"
        bd = top["recommendation_breakdown"]
        top["recommendation_explanation"] = (
            f"Ranked #1 by transparent composite score ({bd['composite_score']:.2f}/1.00) using active weights: "
            f"cost {bd['active_weights']['cost']*100:.0f}%, travel {bd['active_weights']['travel']*100:.0f}%, "
            f"verified reviews {bd['active_weights']['reviews']*100:.0f}%, freshness {bd['active_weights']['freshness']*100:.0f}%."
        )
        for other in complete_offers[1:]:
            other["recommendation_badge"] = "Complete quote"
            obd = other["recommendation_breakdown"]
            other["recommendation_explanation"] = (
                f"Composite score {obd['composite_score']:.2f}/1.00 vs top offer {bd['composite_score']:.2f}/1.00."
            )

    for s_off in snapshot_offers:
        if s_off["quote_completeness"] == "unit_unconfirmed_snapshot":
            s_off["recommendation_badge"] = "Reference snapshot (unit unconfirmed)"
            s_off["recommendation_explanation"] = (
                "Published amount has an unconfirmed unit of measure on the source page; "
                "excluded from normalized unit-price ranking."
            )
        elif s_off["quote_completeness"] == "price_range_observation":
            s_off["recommendation_badge"] = "Published price range (confirm exact offer)"
            s_off["recommendation_explanation"] = (
                "Published price range or market guide across variants/brands; not ranked as a single fixed order offer."
            )
        elif not s_off.get("quantity_tier_matches_order", True):
            s_off["recommendation_badge"] = "Bulk / quantity tier (order qty outside tier)"
            s_off["recommendation_explanation"] = (
                "Published price applies to a different order quantity tier; verify applicable tier for your order size."
            )
        else:
            s_off["recommendation_badge"] = "Published item price (delivery/tax unconfirmed)"
            s_off["recommendation_explanation"] = (
                "Published catalog/price-list snapshot; never labeled 'Cheapest delivered' because "
                f"destination delivery, taxes, and current validity require confirmation ({', '.join(s_off.get('missing_cost_components', []))})."
            )

    for d_lead in directory_leads:
        if not d_lead.get("recommendation_eligible", True):
            d_lead["recommendation_badge"] = None
            d_lead["status_badge"] = "Manual-review lead (unverified specs)"
            d_lead["recommendation_explanation"] = (
                "Retained as a manual-review lead only per data_quality_actions.json; excluded from recommendations."
            )
        else:
            d_lead["recommendation_badge"] = "Quote channel — confirm local availability"
            d_lead["status_badge"] = "Quote channel — confirm local availability"
            d_lead["recommendation_explanation"] = (
                f"{d_lead.get('discovery_tier_label', 'Country buying channel')}; request a direct quotation for price and delivery."
            )

    tier_rank = {
        "tier_1_local_branch": 0,
        "tier_2_service_area_supplier": 1,
        "tier_3_country_buying_channel": 2,
    }

    if sort_mode == "lowest_published_price":
        complete_sorted = sorted(
            complete_offers,
            key=lambda x: (
                Decimal(str(x["delivered_total"])),
                float(x["distance_km"]) if x.get("distance_km") is not None else float("inf"),
                x["display_name"],
                x["supplier_id"],
            ),
        )
        snapshot_sorted = sorted(
            snapshot_offers,
            key=lambda x: (
                0 if (x.get("reference_subtotal") is not None and x.get("quantity_tier_matches_order", True)) else (1 if x.get("reference_subtotal") is not None else 2),
                x.get("product_category") or "zzz",
                x.get("currency") or "ZZZ",
                Decimal(str(x["reference_subtotal"])) if x.get("reference_subtotal") is not None else Decimal("999999999"),
                x["display_name"],
                x.get("price_id") or x["supplier_id"],
            ),
        )
        leads_sorted = sorted(
            directory_leads,
            key=lambda x: (
                0 if x.get("recommendation_eligible", True) else 1,
                tier_rank.get(x.get("discovery_tier", ""), 2),
                x["display_name"],
                x["supplier_id"],
            ),
        )
        final_list = complete_sorted + snapshot_sorted + leads_sorted

    elif sort_mode == "nearest_mapped_store":
        with_dist = [o for o in offers if o.get("distance_km") is not None]
        without_dist = [o for o in offers if o.get("distance_km") is None]
        with_dist.sort(
            key=lambda x: (
                float(x["distance_km"]),
                0 if x.get("is_complete_total") else 1,
                Decimal(str(x["delivered_total"])) if x.get("delivered_total") is not None else Decimal("999999999"),
                x["display_name"],
                x.get("price_id") or x["supplier_id"],
            )
        )
        without_dist.sort(
            key=lambda x: (
                0 if x.get("recommendation_eligible", True) else 1,
                tier_rank.get(x.get("discovery_tier", ""), 2),
                0 if x.get("is_complete_total") else (1 if x.get("reference_subtotal") is not None else 2),
                x["display_name"],
                x.get("price_id") or x["supplier_id"],
            )
        )
        final_list = with_dist + without_dist

    elif sort_mode == "highest_reviewed":
        reviewed = [o for o in offers if o["review_summary"]["review_count"] > 0]
        unreviewed = [o for o in offers if o["review_summary"]["review_count"] == 0]
        reviewed.sort(
            key=lambda x: (
                -(x["review_summary"]["bayesian_score"] or 0.0),
                -x["review_summary"]["review_count"],
                0 if x.get("is_complete_total") else 1,
                x["display_name"],
                x.get("price_id") or x["supplier_id"],
            )
        )
        unreviewed.sort(
            key=lambda x: (
                0 if x.get("recommendation_eligible", True) else 1,
                0 if x.get("is_complete_total") else (1 if x.get("reference_subtotal") is not None else 2),
                x["display_name"],
                x.get("price_id") or x["supplier_id"],
            )
        )
        final_list = reviewed + unreviewed

    else:  # "recommended"
        complete_sorted = sorted(
            complete_offers,
            key=lambda x: (
                -x["recommendation_breakdown"]["composite_score"],
                Decimal(str(x["delivered_total"])),
                float(x["distance_km"]) if x.get("distance_km") is not None else float("inf"),
                -x["review_summary"]["review_count"],
                x["display_name"],
                x.get("price_id") or x["supplier_id"],
            ),
        )
        snapshot_sorted = sorted(
            snapshot_offers,
            key=lambda x: (
                0 if x.get("quantity_tier_matches_order", True) else 1,
                -x["recommendation_breakdown"]["composite_score"],
                0 if x.get("reference_subtotal") is not None else 1,
                Decimal(str(x["reference_subtotal"])) if x.get("reference_subtotal") is not None else Decimal("999999999"),
                x["display_name"],
                x.get("price_id") or x["supplier_id"],
            ),
        )
        leads_sorted = sorted(
            directory_leads,
            key=lambda x: (
                0 if x.get("recommendation_eligible", True) else 1,
                tier_rank.get(x.get("discovery_tier", ""), 2),
                x["display_name"],
                x["supplier_id"],
            ),
        )
        final_list = complete_sorted + snapshot_sorted + leads_sorted

    metadata = {
        "sort_mode": sort_mode,
        "complete_offer_count": len(complete_offers),
        "reference_snapshot_count": len(snapshot_offers),
        "directory_lead_count": len(directory_leads),
        "configured_weights": base_weights,
        "active_weights": active_weights,
        "single_offer_mode": len(complete_offers) == 1,
        "explanation": (
            "Recommended for your filters orders options deterministically by product specification match, "
            "local branch/service-area relevance, confirmed or published item cost within the same category and currency, "
            "and observation freshness. Missing values never become zero cost or hide quote-only channels."
        ),
    }
    return final_list, metadata


def submit_customer_review(
    supplier_id: str,
    reviewer_user_id: str,
    reviewer_display_name: str,
    order_reference: str,
    service_rating: int,
    material_rating: int,
    review_text: str,
    title: Optional[str] = None,
    branch_id: Optional[str] = None,
    verified_purchase: bool = False,
    auto_approve_if_verified: bool = False,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    ensure_market_seeded(db_path)
    if not reviewer_user_id or not reviewer_user_id.strip():
        raise ValueError("Authenticated reviewer_user_id is required to submit a review.")
    if not order_reference or not order_reference.strip():
        raise ValueError("order_reference is required to verify the purchase and prevent duplicate reviews.")
    if not (1 <= int(service_rating) <= 5):
        raise ValueError("service_rating must be an integer between 1 and 5.")
    if not (1 <= int(material_rating) <= 5):
        raise ValueError("material_rating must be an integer between 1 and 5.")
    if not review_text or len(review_text.strip()) < 10:
        raise ValueError("review_text must be at least 10 characters.")

    overall = round((int(service_rating) + int(material_rating)) / 2.0, 2)
    mod_state = "approved" if (verified_purchase and auto_approve_if_verified) else "pending"
    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    now = _utc_now_iso()

    conn = get_connection(db_path)
    try:
        sup = conn.execute(
            "SELECT supplier_id FROM suppliers WHERE supplier_id = ?", (supplier_id,)
        ).fetchone()
        if not sup:
            raise ValueError(f"Supplier '{supplier_id}' not found.")

        try:
            conn.execute(
                """
                INSERT INTO reviews (
                    review_id, supplier_id, branch_id, reviewer_user_id,
                    reviewer_display_name, order_reference, verified_purchase,
                    service_rating, material_rating, overall_rating,
                    title, review_text, moderation_state, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    review_id,
                    supplier_id,
                    branch_id,
                    reviewer_user_id.strip(),
                    reviewer_display_name.strip() or "Verified Buyer",
                    order_reference.strip(),
                    1 if verified_purchase else 0,
                    int(service_rating),
                    int(material_rating),
                    overall,
                    (title or "").strip() or None,
                    review_text.strip(),
                    mod_state,
                    now,
                    now,
                ),
            )
        except sqlite3.IntegrityError as exc:
            raise ValueError(
                f"Duplicate review rejected: user '{reviewer_user_id}' has already reviewed "
                f"order '{order_reference}' for supplier '{supplier_id}'."
            ) from exc

        log_audit_event(
            conn=conn,
            actor=reviewer_user_id,
            role="customer",
            action="submit_review",
            entity_type="review",
            entity_id=review_id,
            details={
                "supplier_id": supplier_id,
                "service_rating": service_rating,
                "material_rating": material_rating,
                "verified_purchase": verified_purchase,
                "moderation_state": mod_state,
            },
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "review_id": review_id,
        "supplier_id": supplier_id,
        "service_rating": int(service_rating),
        "material_rating": int(material_rating),
        "overall_rating": overall,
        "verified_purchase": bool(verified_purchase),
        "moderation_state": mod_state,
        "created_at": now,
    }


def list_supplier_reviews(
    supplier_id: str,
    include_unmoderated: bool = False,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    ensure_market_seeded(db_path)
    conn = get_connection(db_path)
    try:
        if include_unmoderated:
            rows = conn.execute(
                "SELECT * FROM reviews WHERE supplier_id = ? ORDER BY created_at DESC",
                (supplier_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM reviews
                WHERE supplier_id = ? AND moderation_state = 'approved' AND verified_purchase = 1
                ORDER BY created_at DESC
                """,
                (supplier_id,),
            ).fetchall()

        reviews_list = [dict(r) for r in rows]
        approved_verified = [
            r for r in reviews_list if r["moderation_state"] == "approved" and r["verified_purchase"] == 1
        ]
        cnt = len(approved_verified)
        if cnt > 0:
            avg_overall = round(sum(r["overall_rating"] for r in approved_verified) / cnt, 2)
            avg_service = round(sum(r["service_rating"] for r in approved_verified) / cnt, 2)
            avg_material = round(sum(r["material_rating"] for r in approved_verified) / cnt, 2)
            bayesian = _compute_bayesian_review_score(cnt, avg_overall)
        else:
            avg_overall = None
            avg_service = None
            avg_material = None
            bayesian = None

        return {
            "supplier_id": supplier_id,
            "verified_review_count": cnt,
            "mean_overall_rating": avg_overall,
            "mean_service_rating": avg_service,
            "mean_material_rating": avg_material,
            "bayesian_adjusted_score": bayesian,
            "status_label": (
                f"{avg_overall:.1f} / 5 ({cnt} verified reviews)"
                if cnt > 0 and avg_overall
                else "No verified reviews yet"
            ),
            "reviews": reviews_list,
        }
    finally:
        conn.close()


def admin_moderate_review(
    review_id: str,
    moderation_state: str,
    verified_purchase: Optional[bool] = None,
    moderation_reason: Optional[str] = None,
    admin_actor: str = "admin",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    if moderation_state not in ("approved", "rejected", "flagged", "pending"):
        raise ValueError("moderation_state must be 'approved', 'rejected', 'flagged', or 'pending'.")
    now = _utc_now_iso()
    conn = get_connection(db_path)
    try:
        row = conn.execute("SELECT * FROM reviews WHERE review_id = ?", (review_id,)).fetchone()
        if not row:
            raise ValueError(f"Review '{review_id}' not found.")

        vp_val = int(row["verified_purchase"]) if verified_purchase is None else (1 if verified_purchase else 0)
        conn.execute(
            """
            UPDATE reviews
            SET moderation_state = ?, verified_purchase = ?, moderation_reason = ?, updated_at = ?
            WHERE review_id = ?
            """,
            (moderation_state, vp_val, moderation_reason, now, review_id),
        )
        log_audit_event(
            conn=conn,
            actor=admin_actor,
            role="admin",
            action="moderate_review",
            entity_type="review",
            entity_id=review_id,
            details={
                "moderation_state": moderation_state,
                "verified_purchase": bool(vp_val),
                "moderation_reason": moderation_reason,
            },
        )
        conn.commit()
        return {
            "review_id": review_id,
            "supplier_id": row["supplier_id"],
            "moderation_state": moderation_state,
            "verified_purchase": bool(vp_val),
            "updated_at": now,
        }
    finally:
        conn.close()


def admin_upsert_branch_and_quote(
    supplier_id: str,
    country_code: str,
    display_name: str,
    product_category: str,
    product_name: str,
    original_amount: str,
    original_currency: str,
    original_unit: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    city: Optional[str] = None,
    address: Optional[str] = None,
    pack_mass_kg: Optional[float] = None,
    bulk_density_kg_per_m3: Optional[float] = None,
    tax_included: Optional[bool] = True,
    vat_rate_pct: Optional[str] = None,
    delivery_inclusion: str = "included",
    fixed_delivery_fee: Optional[str] = None,
    per_km_rate: Optional[str] = None,
    truck_capacity_m3: str = "8.0",
    min_load_m3: str = "0",
    small_load_fee: Optional[str] = None,
    is_live: bool = True,
    eligible_for_cheapest: bool = True,
    eligible_for_nearest: bool = True,
    source_id: str = "ADMIN_VERIFIED",
    source_url: str = "https://astramix-ai.com/admin/verified-quotes",
    admin_actor: str = "admin",
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    ensure_market_seeded(db_path)
    now = _utc_now_iso()
    cc = country_code.upper().strip()
    curr = original_currency.upper().strip()
    branch_id = f"br_{supplier_id}"
    price_id = f"pq_{supplier_id}_{product_category}"
    rule_id = f"dr_{supplier_id}"

    amt_num: Optional[float] = None
    try:
        amt_num = float(original_amount)
    except (TypeError, ValueError):
        amt_num = None

    conn = get_connection(db_path)
    try:
        conn.execute(
            """
            INSERT INTO sources (source_id, title, url, source_type, observed_at, observation_method, evidence_summary, updated_at)
            VALUES (?, ?, ?, 'admin_verified_quote', ?, 'direct_supplier_verification', 'Verified by AstraMix administrator.', ?)
            ON CONFLICT(source_id) DO NOTHING
            """,
            (source_id, f"Verified Admin Source ({source_id})", source_url, now[:10], now),
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
                notes, is_active, updated_at, recommendation_eligible, data_origin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', NULL, 0, ?, 'verified_commercial_quote', ?, ?, 'Admin verified supplier', 1, ?, 1, 'admin_verified')
            ON CONFLICT(supplier_id) DO UPDATE SET
                country_code=excluded.country_code,
                display_name=excluded.display_name,
                record_type=excluded.record_type,
                product_categories_json=excluded.product_categories_json,
                branch_id=excluded.branch_id,
                latitude=excluded.latitude,
                longitude=excluded.longitude,
                supplier_confirmed_at=excluded.supplier_confirmed_at,
                commercial_status=excluded.commercial_status,
                eligible_for_nearest=excluded.eligible_for_nearest,
                eligible_for_cheapest=excluded.eligible_for_cheapest,
                is_active=1,
                recommendation_eligible=1,
                updated_at=excluded.updated_at
            """,
            (
                supplier_id,
                cc,
                display_name,
                "verified_local_branch" if (latitude is not None and longitude is not None) else "retailer_or_producer_price_source",
                json.dumps([source_id]),
                source_url,
                json.dumps([product_category]),
                branch_id if (latitude is not None and longitude is not None) else None,
                latitude,
                longitude,
                city,
                now[:10],
                1 if (eligible_for_nearest and latitude is not None and longitude is not None) else 0,
                1 if eligible_for_cheapest else 0,
                now,
            ),
        )

        if latitude is not None and longitude is not None:
            conn.execute(
                """
                INSERT INTO branches (
                    branch_id, supplier_id, country_code, branch_name,
                    city, address, latitude, longitude, verified_status,
                    source_id, is_active, updated_at, display_name,
                    address_text, location_role, retail_access_claimed,
                    eligible_for_nearest, data_origin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verified_branch', ?, 1, ?, ?, ?, 'retail_branch', 1, ?, 'admin_verified')
                ON CONFLICT(branch_id) DO UPDATE SET
                    city=excluded.city,
                    address=excluded.address,
                    latitude=excluded.latitude,
                    longitude=excluded.longitude,
                    eligible_for_nearest=excluded.eligible_for_nearest,
                    updated_at=excluded.updated_at
                """,
                (
                    branch_id,
                    supplier_id,
                    cc,
                    f"{display_name} ({city or 'Branch'})",
                    city,
                    address,
                    latitude,
                    longitude,
                    source_id,
                    now,
                    f"{display_name} ({city or 'Branch'})",
                    address,
                    1 if eligible_for_nearest else 0,
                ),
            )

        tax_db = None if tax_included is None else (1 if tax_included else 0)
        conn.execute(
            """
            INSERT INTO price_snapshots (
                price_id, country_code, supplier_id, branch_id,
                source_ids_json, product_name, product_category,
                specification_json, original_amount, original_currency,
                original_unit, pack_mass_kg, bulk_density_kg_per_m3,
                tax_included, vat_rate_pct, delivery_inclusion,
                observed_at, supplier_confirmed_at, price_status,
                is_live, eligible_for_cheapest, eligible_for_cheapest_delivered,
                notes, is_active, updated_at, amount_numeric, data_origin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified_live_quote', ?, ?, ?, 'Admin verified quote', 1, ?, ?, 'admin_verified')
            ON CONFLICT(price_id) DO UPDATE SET
                product_name=excluded.product_name,
                original_amount=excluded.original_amount,
                original_currency=excluded.original_currency,
                original_unit=excluded.original_unit,
                pack_mass_kg=excluded.pack_mass_kg,
                bulk_density_kg_per_m3=excluded.bulk_density_kg_per_m3,
                tax_included=excluded.tax_included,
                vat_rate_pct=excluded.vat_rate_pct,
                delivery_inclusion=excluded.delivery_inclusion,
                supplier_confirmed_at=excluded.supplier_confirmed_at,
                is_live=excluded.is_live,
                eligible_for_cheapest=excluded.eligible_for_cheapest,
                eligible_for_cheapest_delivered=excluded.eligible_for_cheapest_delivered,
                amount_numeric=excluded.amount_numeric,
                is_active=1,
                updated_at=excluded.updated_at
            """,
            (
                price_id,
                cc,
                supplier_id,
                branch_id if (latitude is not None and longitude is not None) else None,
                json.dumps([source_id]),
                product_name,
                product_category,
                str(original_amount),
                curr,
                original_unit,
                pack_mass_kg,
                bulk_density_kg_per_m3,
                tax_db,
                vat_rate_pct,
                delivery_inclusion,
                now[:10],
                now[:10] if is_live else None,
                1 if is_live else 0,
                1 if eligible_for_cheapest else 0,
                1 if eligible_for_cheapest else 0,
                now,
                amt_num,
            ),
        )

        if any(x is not None for x in (fixed_delivery_fee, per_km_rate, small_load_fee)):
            conn.execute(
                """
                INSERT INTO delivery_rules (
                    rule_id, supplier_id, branch_id, applies_to_category,
                    currency, fixed_delivery_fee, per_km_rate,
                    truck_capacity_m3, min_load_m3, small_load_fee,
                    is_active, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(rule_id) DO UPDATE SET
                    fixed_delivery_fee=excluded.fixed_delivery_fee,
                    per_km_rate=excluded.per_km_rate,
                    truck_capacity_m3=excluded.truck_capacity_m3,
                    min_load_m3=excluded.min_load_m3,
                    small_load_fee=excluded.small_load_fee,
                    updated_at=excluded.updated_at
                """,
                (
                    rule_id,
                    supplier_id,
                    branch_id if (latitude is not None and longitude is not None) else None,
                    product_category,
                    curr,
                    fixed_delivery_fee,
                    per_km_rate,
                    truck_capacity_m3,
                    min_load_m3,
                    small_load_fee,
                    now,
                ),
            )

        log_audit_event(
            conn=conn,
            actor=admin_actor,
            role="admin",
            action="upsert_branch_and_quote",
            entity_type="supplier_quote",
            entity_id=price_id,
            details={
                "supplier_id": supplier_id,
                "country_code": cc,
                "product_category": product_category,
                "original_amount": original_amount,
                "original_currency": curr,
                "original_unit": original_unit,
                "is_live": is_live,
                "eligible_for_cheapest": eligible_for_cheapest,
            },
        )
        conn.commit()
        return {
            "supplier_id": supplier_id,
            "branch_id": branch_id if (latitude is not None and longitude is not None) else None,
            "price_id": price_id,
            "status": "upserted",
            "updated_at": now,
        }
    finally:
        conn.close()


def admin_list_audit_logs(limit: int = 50, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    ensure_market_seeded(db_path)
    conn = get_connection(db_path)
    try:
        rows = conn.execute(
            "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (int(limit),)
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            if d.get("details_json"):
                try:
                    d["details"] = json.loads(d["details_json"])
                except Exception:
                    d["details"] = {}
            out.append(d)
        return out
    finally:
        conn.close()

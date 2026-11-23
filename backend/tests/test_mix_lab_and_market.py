"""
Comprehensive test suite for AstraMix Mix Lab + Materials Market upgrade.
Uses an isolated temporary SQLite database via monkeypatch/fixture so test runs
never pollute public production data.
"""
from decimal import Decimal
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from astramix.market.units import (
    MissingBulkDensityError,
    calculate_ready_mix_order,
    convert_quantity,
    round_to_whole_bags,
)

client = TestClient(app)

VALID_MIX = {
    "cement": 350.0,
    "blast_furnace_slag": 50.0,
    "fly_ash": 30.0,
    "water": 165.0,
    "superplasticizer": 4.5,
    "coarse_aggregate": 1020.0,
    "fine_aggregate": 750.0,
    "age": 28,
}


@pytest.fixture(autouse=True)
def isolated_market_db(tmp_path, monkeypatch):
    """Ensure every test uses an isolated SQLite DB and never mutates production data."""
    test_db = tmp_path / "test_astramix_market.db"
    monkeypatch.setenv("ASTRAMIX_MARKET_DB_PATH", str(test_db))
    monkeypatch.setenv("ASTRAMIX_ADMIN_TOKEN", "test-secret-admin-token")
    yield test_db


# --- 1. Versioned Input Schema & Strict Boundary Validation ---

def test_mix_input_schema_endpoint_exposes_bounds_and_split_comparison():
    res = client.get("/api/v1/schema/mix-input")
    assert res.status_code == 200
    body = res.json()
    assert body["schema_version"] == "1.0.0"
    features = body["features"]
    assert features["cement"]["min"] == 102.0
    assert features["cement"]["max"] == 540.0
    assert features["blast_furnace_slag"]["min"] == 0.0
    assert features["blast_furnace_slag"]["max"] == 359.4
    assert features["fly_ash"]["min"] == 0.0
    assert features["fly_ash"]["max"] == 200.1
    from astramix.models.strength.predict import load_model_metadata
    assert features["fly_ash"]["train_split_bounds"] == load_model_metadata()["training_bounds"]["fly_ash"]
    assert features["water"]["min"] == 121.75
    assert features["water"]["max"] == 247.0
    assert features["superplasticizer"]["min"] == 0.0
    assert features["superplasticizer"]["max"] == 32.2
    assert features["coarse_aggregate"]["min"] == 801.0
    assert features["coarse_aggregate"]["max"] == 1145.0
    assert features["fine_aggregate"]["min"] == 594.0
    assert features["fine_aggregate"]["max"] == 992.6
    assert features["age"]["min"] == 1
    assert features["age"]["max"] == 365
    assert features["age"]["type"] == "integer"
    assert "not engineering safety limits" in body["disclaimers"]["training_bounds"]


def test_boundary_inputs_succeed_and_just_outside_inputs_fail():
    # Exact lower boundary (with plausible w/b ratio: cement=200, water=121.75 -> w/b=0.608)
    lower_bound_mix = {
        "cement": 102.0,
        "blast_furnace_slag": 100.0,
        "fly_ash": 0.0,
        "water": 121.75,
        "superplasticizer": 0.0,
        "coarse_aggregate": 801.0,
        "fine_aggregate": 594.0,
        "age": 1,
    }
    res_low = client.post("/api/v1/mix-lab/evaluate", json={"mix": lower_bound_mix})
    assert res_low.status_code == 200, res_low.text

    # Exact upper boundary (cement=540, slag=359.4, ash=200.1 -> binder=1099.5, water=247 -> w/b=0.2246)
    upper_bound_mix = {
        "cement": 540.0,
        "blast_furnace_slag": 359.4,
        "fly_ash": 200.1,
        "water": 247.0,
        "superplasticizer": 32.2,
        "coarse_aggregate": 1145.0,
        "fine_aggregate": 992.6,
        "age": 365,
    }
    res_high = client.post("/api/v1/mix-lab/evaluate", json={"mix": upper_bound_mix})
    assert res_high.status_code == 200, res_high.text

    # Just-outside values must fail with 422 on both /predict-strength and /mix-lab/evaluate
    invalid_cases = [
        ("cement", 101.99),
        ("cement", 540.01),
        ("blast_furnace_slag", -0.01),
        ("blast_furnace_slag", 359.41),
        ("fly_ash", -0.1),
        ("fly_ash", 200.11),
        ("water", 121.74),
        ("water", 247.01),
        ("superplasticizer", -0.01),
        ("superplasticizer", 32.21),
        ("coarse_aggregate", 800.99),
        ("coarse_aggregate", 1145.01),
        ("fine_aggregate", 593.99),
        ("fine_aggregate", 992.61),
        ("age", 0),
        ("age", 366),
        ("age", 28.5),
        ("age", "28.5"),
        ("cement", "NaN"),
        ("water", "Infinity"),
        ("water", "-Infinity"),
        ("cement", True),
    ]
    for field, bad_val in invalid_cases:
        bad_mix = {**VALID_MIX, field: bad_val}
        r1 = client.post("/api/v1/predict-strength", json={"mix": bad_mix})
        assert r1.status_code == 422, f"Expected 422 for {field}={bad_val}, got {r1.status_code}"
        r2 = client.post("/api/v1/mix-lab/evaluate", json={"mix": bad_mix})
        assert r2.status_code == 422, f"Expected 422 on mix-lab/evaluate for {field}={bad_val}"

    # Missing required field must fail with 422
    for req_field in VALID_MIX.keys():
        incomplete_mix = {k: v for k, v in VALID_MIX.items() if k != req_field}
        r_miss = client.post("/api/v1/predict-strength", json={"mix": incomplete_mix})
        assert r_miss.status_code == 422, f"Expected 422 when missing required field {req_field}"


# --- 2. Mix Lab Three Result Cards & Comparison Rules ---

def test_mix_lab_three_cards_target_and_no_target_strength():
    # 1. No target strength -> neutral training distribution context
    res_no_target = client.post("/api/v1/mix-lab/evaluate", json={"mix": VALID_MIX})
    assert res_no_target.status_code == 200
    cards = res_no_target.json()["cards"]
    s_card = cards["predicted_strength"]
    assert s_card["color"] == "neutral"
    assert s_card["status"] == "neutral_context"
    assert s_card["comparison"]["mode"] == "training_distribution_context"

    pred_val = s_card["headline_value"]

    # 2. Target well below predicted (pred >= target + 4.62 RMSE) -> green
    res_green = client.post(
        "/api/v1/mix-lab/evaluate",
        json={"mix": VALID_MIX, "target_strength_mpa": max(5.0, pred_val - 10.0)},
    )
    assert res_green.json()["cards"]["predicted_strength"]["color"] == "green"
    assert res_green.json()["cards"]["predicted_strength"]["status"] == "meets_target_with_margin"

    # 3. Target barely met within RMSE (target <= pred < target + 4.62) -> yellow
    res_yellow = client.post(
        "/api/v1/mix-lab/evaluate",
        json={"mix": VALID_MIX, "target_strength_mpa": pred_val - 2.0},
    )
    assert res_yellow.json()["cards"]["predicted_strength"]["color"] == "yellow"
    assert res_yellow.json()["cards"]["predicted_strength"]["status"] == "meets_target_within_uncertainty"

    # 4. Target above predicted -> red
    res_red = client.post(
        "/api/v1/mix-lab/evaluate",
        json={"mix": VALID_MIX, "target_strength_mpa": pred_val + 10.0},
    )
    assert res_red.json()["cards"]["predicted_strength"]["color"] == "red"
    assert res_red.json()["cards"]["predicted_strength"]["status"] == "below_target"


def test_mix_lab_market_cohort_requires_at_least_10_observations():
    # Fewer than 10 observations -> neutral "Insufficient comparison data"
    res_few = client.post(
        "/api/v1/mix-lab/evaluate",
        json={
            "mix": VALID_MIX,
            "comparison_mode": "market_cohort",
            "pricing_region": "AM",
            "cohort_context": {"region": "AM", "currency": "USD", "unit_basis": "m3", "scope": "ingredients_only"},
            "cohort_observation_ids": [f"row-{i}" for i in range(5)],
            "market_cohort_costs": [50.0, 60.0, 70.0, 80.0, 90.0],
            "market_cohort_emissions": [200.0, 250.0, 300.0],
        },
    )
    assert res_few.status_code == 200
    cards_few = res_few.json()["cards"]
    assert cards_few["estimated_ingredient_cost"]["status"] == "insufficient_comparison_data"
    assert cards_few["estimated_ingredient_cost"]["color"] == "neutral"
    assert cards_few["estimated_ingredient_cost"]["badge"] == "Insufficient comparison data"
    assert cards_few["estimated_embodied_emissions"]["status"] == "insufficient_comparison_data"
    assert cards_few["estimated_embodied_emissions"]["color"] == "neutral"

    # >= 10 observations -> computes P25/P50/P75 bands
    cohort_12_costs = [90.0, 95.0, 100.0, 105.0, 110.0, 115.0, 120.0, 125.0, 130.0, 135.0, 140.0, 150.0]
    cohort_12_co2 = [180.0, 200.0, 220.0, 240.0, 260.0, 280.0, 300.0, 320.0, 340.0, 360.0, 380.0, 400.0]
    res_12 = client.post(
        "/api/v1/mix-lab/evaluate",
        json={
            "mix": VALID_MIX,
            "comparison_mode": "market_cohort",
            "pricing_region": "AM",
            "cohort_context": {"region": "AM", "currency": "USD", "unit_basis": "m3", "scope": "ingredients_only"},
            "cohort_observation_ids": [f"row-{i}" for i in range(12)],
            "market_cohort_costs": cohort_12_costs,
            "market_cohort_emissions": cohort_12_co2,
        },
    )
    assert res_12.status_code == 200
    cards_12 = res_12.json()["cards"]
    assert cards_12["estimated_ingredient_cost"]["comparison"]["sufficient_data"] is True
    assert cards_12["estimated_ingredient_cost"]["comparison"]["observation_count"] == 12
    assert cards_12["estimated_embodied_emissions"]["comparison"]["sufficient_data"] is True


def test_mix_lab_incomplete_cost_and_emissions_when_factor_missing():
    # Missing cement price and missing superplasticizer emission factor
    partial_prices = {
        "cement": None,
        "blast_furnace_slag": 0.06,
        "fly_ash": 0.05,
        "water": 0.002,
        "superplasticizer": 2.5,
        "coarse_aggregate": 0.015,
        "fine_aggregate": 0.018,
    }
    partial_factors = {
        "cement": 0.85,
        "blast_furnace_slag": 0.08,
        "fly_ash": 0.02,
        "water": 0.001,
        "superplasticizer": None,
        "coarse_aggregate": 0.005,
        "fine_aggregate": 0.005,
    }
    res = client.post(
        "/api/v1/mix-lab/evaluate",
        json={
            "mix": VALID_MIX,
            "unit_costs": partial_prices,
            "strict_custom_prices": True,
            "emission_factors": partial_factors,
            "strict_custom_factors": True,
        },
    )
    assert res.status_code == 200
    cards = res.json()["cards"]

    cost_card = cards["estimated_ingredient_cost"]
    assert cost_card["is_complete"] is False
    assert cost_card["status"] == "incomplete"
    assert cost_card["color"] == "neutral"
    assert cost_card["badge"] == "Incomplete ingredient cost estimate"
    assert "cement" in cost_card["coverage"]["missing_ingredients"]
    assert 0.0 < cost_card["coverage"]["priced_mass_coverage_ratio"] < 1.0

    em_card = cards["estimated_embodied_emissions"]
    assert em_card["is_complete"] is False
    assert em_card["status"] == "incomplete"
    assert em_card["color"] == "neutral"
    assert em_card["badge"] == "Incomplete embodied emissions estimate"
    assert "superplasticizer" in em_card["coverage"]["missing_ingredients"]


def test_optimizer_distinguishes_wc_and_wb_and_reports_infeasibility():
    # Feasible optimization
    res_ok = client.post(
        "/api/v1/mix-lab/optimize",
        json={
            "constraints": {
                "target_strength_mpa": 35.0,
                "age": 28,
                "max_w_c_ratio": 0.55,
                "max_w_b_ratio": 0.45,
                "alpha": 1.0,
                "beta": 1.0,
            }
        },
    )
    assert res_ok.status_code == 200
    body_ok = res_ok.json()
    assert body_ok["success"] is True
    assert body_ok["is_optimum"] is False
    assert body_ok["search"]["optimality_scope"] == "best_evaluated_candidate"
    assert body_ok["solver_status"] == "feasible_candidate_found"
    mix = body_ok["mix"]
    assert 102.0 <= mix["cement"] <= 540.0
    assert 121.75 <= mix["water"] <= 247.0
    assert body_ok["water_cement_ratio"] == pytest.approx(mix["water"] / mix["cement"], abs=1e-3)
    binder = mix["cement"] + mix["fly_ash"] + mix["blast_furnace_slag"]
    assert body_ok["water_binder_ratio"] == pytest.approx(mix["water"] / binder, abs=1e-3)
    assert body_ok["water_cement_ratio"] <= 0.55 + 0.005
    assert body_ok["water_binder_ratio"] <= 0.45 + 0.005

    # Infeasible optimization (unreachable target strength 140 MPa)
    res_inf = client.post(
        "/api/v1/mix-lab/optimize",
        json={
            "constraints": {
                "target_strength_mpa": 140.0,
                "age": 28,
                "max_w_c_ratio": 0.50,
            }
        },
    )
    assert res_inf.status_code == 200
    body_inf = res_inf.json()
    assert body_inf["success"] is False
    assert body_inf["is_optimum"] is False
    assert body_inf["solver_status"] == "no_feasible_candidate_found"
    assert body_inf["failure_reason"] is not None
    assert "search budget" in body_inf["status_label"]


# --- 3. Materials Market 50-Country Refresh, Location Suggestions, Unit Normalization, Basket & Order Pricing ---

def test_market_overview_and_idempotent_50_country_import():
    res1 = client.get("/api/v1/market/overview")
    assert res1.status_code == 200
    cov1 = res1.json()["coverage"]
    assert cov1["country_count"] == 100
    assert cov1["refreshed_50_country_count"] == 50
    assert cov1["prior_lead_fallback_country_count"] == 50
    assert cov1["global_50_supplier_count"] == 542
    assert cov1["cameroon_discovery_record_count"] == 40
    assert cov1["cameroon_supplier_count"] == 7
    assert cov1["cameroon_retail_directory_branch_count"] == 33
    assert cov1["preserved_prior_supplier_count"] == 53
    assert cov1["supplier_count"] == 602  # 542 + 7 + 53 (never counts 33 CM branches as parent companies)
    assert cov1["global_50_branch_count"] == 3451
    assert cov1["global_50_retail_outlet_count"] == 3006
    assert cov1["refreshed_50_price_observation_count"] == 116  # 109 global + 7 CM numeric
    assert cov1["refreshed_50_single_numeric_price_count"] == 114
    assert cov1["refreshed_50_price_range_count"] == 2
    assert cov1["preserved_prior_price_snapshot_count"] == 16
    assert cov1["price_snapshot_count"] == 132
    assert cov1["availability_observation_count"] == 37  # 30 global + 7 CM catalog
    assert cov1["verified_branch_count"] == 2176
    assert cov1["data_quality_action_count"] == 15
    assert cov1["verified_review_count"] == 0
    assert cov1["live_confirmed_quote_count"] == 0

    # Re-run 50-country refresh import via admin endpoint and verify counts are 100% identical (idempotent)
    headers = {"X-Admin-Token": "test-secret-admin-token"}
    imp_res = client.post("/api/v1/admin/import/refresh-50", headers=headers)
    assert imp_res.status_code == 200
    res2 = client.get("/api/v1/market/overview")
    assert res2.status_code == 200
    cov2 = res2.json()["coverage"]
    assert cov2 == cov1



def test_unit_conversions_bag_rounding_and_missing_bulk_density():
    # 1 yd³ = 0.764554857984 m³
    assert convert_quantity(10, "yd3", "m3") == Decimal("7.64554857984")
    # 1 lb = 0.45359237 kg
    assert convert_quantity(100, "lb", "kg") == Decimal("45.359237")
    # Metric vs US short vs UK long ton
    assert convert_quantity(1, "tonne", "kg") == Decimal("1000")
    assert convert_quantity(1, "short_ton", "kg") == Decimal("907.18474")
    assert convert_quantity(1, "long_ton", "kg") == Decimal("1016.0469088")

    # Whole-bag rounding (350 kg/m³ * 2.5 m³ = 875 kg; in 40 kg bags -> 22 bags = 880 kg, 5 kg surplus)
    bag_res = round_to_whole_bags(Decimal("875"), Decimal("40"))
    assert bag_res.bags_needed == 22
    assert bag_res.purchased_kg == Decimal("880.00")
    assert bag_res.surplus_kg == Decimal("5.00")

    # Mass <-> volume conversion must fail when bulk_density_kg_per_m3 is None
    with pytest.raises(MissingBulkDensityError):
        convert_quantity(1000, "kg", "m3", bulk_density_kg_per_m3=None)

    # Succeeds when product-specific bulk_density_kg_per_m3 is provided
    assert convert_quantity(1600, "kg", "m3", bulk_density_kg_per_m3=1600) == Decimal("1")


def test_ready_mix_order_truckloads_surcharges_and_single_tax_inclusion():
    # 10 m³ with 8 m³ truck capacity -> 2 trucks (8.0 m³ + 2.0 m³)
    # Min load 4.0 m³ -> 2nd truck has 2.0 m³ shortfall -> small_load_fee applied once
    rm = calculate_ready_mix_order(
        volume_m3="10.0",
        unit_price_per_m3="120.00",
        currency="USD",
        vat_status="ex_vat",
        vat_rate_pct="20.0",
        delivery_status="ex_works",
        truck_capacity_m3="8.0",
        min_load_m3="4.0",
        small_load_fee="75.00",
        fixed_delivery_fee_per_truck="50.00",
        needs_pump=True,
        pump_fixed_fee="150.00",
    )
    assert rm.truck_count == 2
    assert rm.load_volumes_m3 == [Decimal("8.00"), Decimal("2.00")]
    assert rm.base_material_subtotal == Decimal("1200.00")
    assert rm.small_load_fee == Decimal("75.00")
    assert rm.delivery_fee == Decimal("100.00")  # 2 trucks * $50
    assert rm.pump_fee == Decimal("150.00")
    assert rm.subtotal_ex_vat == Decimal("1525.00")
    assert rm.vat_amount == Decimal("305.00")
    assert rm.total_inc_vat == Decimal("1830.00")
    assert rm.is_complete_total is True

    # When unit price is already inc_vat and delivery_status is 'delivered', neither is double-counted
    rm_inc = calculate_ready_mix_order(
        volume_m3="6.0",
        unit_price_per_m3="150.00",
        currency="EUR",
        vat_status="inc_vat",
        delivery_status="delivered",
    )
    assert rm_inc.delivery_fee == Decimal("0.00")
    assert rm_inc.total_inc_vat == Decimal("900.00")
    assert rm_inc.is_complete_total is True


def test_basket_from_mix_and_market_search_modes():
    # Generate basket for 3.0 m³ of VALID_MIX
    b_res = client.post(
        "/api/v1/market/basket-from-mix",
        json={"mix": VALID_MIX, "project_volume_m3": 3.0},
    )
    assert b_res.status_code == 200
    basket = b_res.json()
    assert basket["project_volume_m3"] == "3.00"
    cement_item = next(i for i in basket["items"] if i["material_key"] == "cement")
    assert cement_item["required_kg"] == "1050.00"
    assert cement_item["bag_rounding_preview"]["bags_needed"] == 21

    # Search Italy ready-mix: verify government benchmark is in benchmark_references, NOT in offers
    it_res = client.post(
        "/api/v1/market/search",
        json={"tab": "ready_mix", "country_code": "IT", "volume_m3": 8.0, "sort_by": "recommended"},
    )
    assert it_res.status_code == 200
    it_body = it_res.json()
    assert len(it_body["benchmark_references"]) == 1
    assert it_body["benchmark_references"][0]["benchmark_id"] == "it_fvg_2026_c2530_s4"
    assert it_body["benchmark_references"][0]["record_type"] == "government_cost_schedule_not_supplier_offer"
    offer_ids = [o["supplier_id"] for o in it_body["offers"]]
    assert "it_fvg_2026_c2530_s4" not in offer_ids


def test_admin_auth_single_offer_badge_and_four_sorting_modes():
    # 1. Admin endpoint rejects missing/wrong token with 403
    unauth = client.get("/api/v1/admin/audit-logs")
    assert unauth.status_code == 403

    headers = {"X-Admin-Token": "test-secret-admin-token"}

    # 2. Insert 1 complete verified quote in Armenia -> must get badge 'Only matched offer'
    q1 = {
        "supplier_id": "am_verified_1",
        "country_code": "AM",
        "display_name": "Ararat Verified Concrete Plant",
        "product_category": "ready_mix",
        "product_name": "C25/30 Ready-Mix Delivered",
        "original_amount": "36000",
        "original_currency": "AMD",
        "original_unit": "m3",
        "latitude": 40.1500,
        "longitude": 44.5000,
        "city": "Yerevan",
        "tax_included": True,
        "delivery_inclusion": "included",
        "is_live": True,
        "eligible_for_cheapest": True,
        "eligible_for_nearest": True,
    }
    r_up1 = client.post("/api/v1/admin/suppliers/upsert-quote", json=q1, headers=headers)
    assert r_up1.status_code == 200

    search_1 = client.post(
        "/api/v1/market/search",
        json={
            "tab": "ready_mix",
            "country_code": "AM",
            "volume_m3": 5.0,
            "location_query": "Yerevan",
            "sort_by": "recommended",
        },
    ).json()
    assert search_1["sorting_metadata"]["complete_offer_count"] == 1
    assert search_1["sorting_metadata"]["single_offer_mode"] is True
    top_1 = search_1["offers"][0]
    assert top_1["supplier_id"] == "am_verified_1"
    assert top_1["recommendation_badge"] == "Only matched offer"

    # 3. Insert a 2nd verified quote (closer but slightly higher price, and with a verified approved review)
    q2 = {
        "supplier_id": "am_verified_2",
        "country_code": "AM",
        "display_name": "Kentron Batching Plant",
        "product_category": "ready_mix",
        "product_name": "C25/30 Ready-Mix Delivered",
        "original_amount": "39000",
        "original_currency": "AMD",
        "original_unit": "m3",
        "latitude": 40.1790,
        "longitude": 44.4990,
        "city": "Yerevan",
        "tax_included": True,
        "delivery_inclusion": "included",
        "is_live": True,
        "eligible_for_cheapest": True,
        "eligible_for_nearest": True,
    }
    client.post("/api/v1/admin/suppliers/upsert-quote", json=q2, headers=headers)

    # Submit and approve a verified customer review on am_verified_2
    rev_res = client.post(
        "/api/v1/market/suppliers/am_verified_2/reviews",
        json={
            "reviewer_user_id": "buyer_01",
            "reviewer_display_name": "Armen S.",
            "order_reference": "ORD-2026-901",
            "service_rating": 5,
            "material_rating": 5,
            "title": "On-time slump and cube test verified",
            "review_text": "Delivered on schedule in Yerevan; 28-day cube test exceeded 32 MPa.",
            "verified_purchase": True,
        },
    )
    assert rev_res.status_code == 200
    rev_id = rev_res.json()["review_id"]

    # Duplicate review for same supplier + user + order_reference must be rejected
    dup_res = client.post(
        "/api/v1/market/suppliers/am_verified_2/reviews",
        json={
            "reviewer_user_id": "buyer_01",
            "reviewer_display_name": "Armen S.",
            "order_reference": "ORD-2026-901",
            "service_rating": 4,
            "material_rating": 4,
            "review_text": "Attempting a duplicate review on the same order.",
        },
    )
    assert dup_res.status_code == 400

    # Before moderation approval, public review count is still 0
    pub_before = client.get("/api/v1/market/suppliers/am_verified_2/reviews").json()
    assert pub_before["verified_review_count"] == 0

    # Approve via admin moderation endpoint
    mod_res = client.post(
        f"/api/v1/admin/reviews/{rev_id}/moderate",
        json={"moderation_state": "approved", "verified_purchase": True},
        headers=headers,
    )
    assert mod_res.status_code == 200

    pub_after = client.get("/api/v1/market/suppliers/am_verified_2/reviews").json()
    assert pub_after["verified_review_count"] == 1
    assert pub_after["mean_service_rating"] == 5.0
    assert pub_after["mean_material_rating"] == 5.0

    # Verify all 4 sorting modes produce distinct, expected ordering
    s_cheapest = client.post(
        "/api/v1/market/search",
        json={"tab": "ready_mix", "country_code": "AM", "volume_m3": 5.0, "location_query": "Yerevan", "sort_by": "lowest_delivered_total"},
    ).json()
    assert s_cheapest["offers"][0]["supplier_id"] == "am_verified_1"

    s_nearest = client.post(
        "/api/v1/market/search",
        json={"tab": "ready_mix", "country_code": "AM", "volume_m3": 5.0, "location_query": "Yerevan", "sort_by": "nearest"},
    ).json()
    assert s_nearest["offers"][0]["supplier_id"] == "am_verified_2"

    s_reviewed = client.post(
        "/api/v1/market/search",
        json={"tab": "ready_mix", "country_code": "AM", "volume_m3": 5.0, "location_query": "Yerevan", "sort_by": "highest_reviewed"},
    ).json()
    assert s_reviewed["offers"][0]["supplier_id"] == "am_verified_2"

    # Check audit logs recorded admin actions
    logs_res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert logs_res.status_code == 200
    assert len(logs_res.json()["audit_logs"]) >= 3


def test_all_50_refreshed_countries_return_valid_summary_and_records():
    codes_50 = [
        "AE", "AM", "AR", "AT", "AU", "BD", "BE", "BR", "CA", "CH",
        "CI", "CL", "CM", "CN", "CO", "CZ", "DE", "EG", "ES", "FR",
        "GB", "GE", "GH", "ID", "IE", "IN", "IT", "JP", "KE", "KR",
        "MA", "MX", "MY", "NG", "NL", "NZ", "PE", "PH", "PK", "PL",
        "PT", "RO", "SA", "SE", "SN", "TR", "TZ", "US", "VN", "ZA",
    ]
    assert len(codes_50) == 50

    for cc in codes_50:
        res = client.post(
            "/api/v1/market/search",
            json={"tab": "all", "category": "all", "country_code": cc},
        )
        assert res.status_code == 200, f"Search failed for {cc}: {res.text}"
        body = res.json()
        assert body["country"]["country_code"] == cc
        assert body["country"]["market_refresh_status"] == "researched_50_market_refresh"
        assert len(body["offers"]) >= 1, f"Expected at least 1 record for {cc}"


def test_location_suggestions_latin_native_scripts_and_validation():
    # Both /api/v1/locations/suggest and /api/locations/suggest work
    r_am_en = client.get("/api/v1/locations/suggest", params={"country": "AM", "q": "Yerevan", "limit": 8})
    assert r_am_en.status_code == 200
    b_am_en = r_am_en.json()
    assert b_am_en["country_code"] == "AM"
    assert any(s["id"] == "geonames:616052" and s["name"] == "Yerevan" for s in b_am_en["suggestions"])
    assert "GeoNames" in b_am_en["attribution"]

    # Native script Armenian query: Երևան
    r_am_hy = client.get("/api/locations/suggest", params={"country": "AM", "q": "Երևան", "limit": 5})
    assert r_am_hy.status_code == 200
    assert r_am_hy.json()["suggestions"][0]["name"] == "Yerevan"

    # Diacritic & ASCII matching in Cameroon: Yaoundé and Yaounde, Douala
    r_cm_1 = client.get("/api/v1/locations/suggest", params={"country": "CM", "q": "Yaoundé"})
    r_cm_2 = client.get("/api/v1/locations/suggest", params={"country": "CM", "q": "Yaounde"})
    assert r_cm_1.status_code == 200 and r_cm_2.status_code == 200
    assert r_cm_1.json()["suggestions"][0]["id"] == "geonames:2220957"
    assert r_cm_2.json()["suggestions"][0]["id"] == "geonames:2220957"

    r_cm_dl = client.get("/api/v1/locations/suggest", params={"country": "CM", "q": "Douala"})
    assert r_cm_dl.status_code == 200
    assert r_cm_dl.json()["suggestions"][0]["name"] == "Douala"

    # Canada (Toronto) and United States (New York)
    r_ca = client.get("/api/v1/locations/suggest", params={"country": "CA", "q": "Toronto"})
    assert r_ca.status_code == 200
    assert r_ca.json()["suggestions"][0]["name"] == "Toronto"

    r_us = client.get("/api/v1/locations/suggest", params={"country": "US", "q": "New York"})
    assert r_us.status_code == 200
    assert any("New York" in s["name"] for s in r_us.json()["suggestions"])

    # Empty query returns top cities by population
    r_empty = client.get("/api/v1/locations/suggest", params={"country": "AM", "q": "", "limit": 5})
    assert r_empty.status_code == 200
    pops = [s["population"] for s in r_empty.json()["suggestions"]]
    assert pops == sorted(pops, reverse=True)

    # Invalid inputs return 400
    assert client.get("/api/v1/locations/suggest", params={"country": "XX", "q": "Test"}).status_code == 400
    assert client.get("/api/v1/locations/suggest", params={"country": "123", "q": "Test"}).status_code == 400
    assert client.get("/api/v1/locations/suggest", params={"country": "AM", "limit": 0}).status_code == 400
    assert client.get("/api/v1/locations/suggest", params={"country": "AM", "limit": 25}).status_code == 400
    assert client.get("/api/v1/locations/suggest", params={"country": "AM", "q": "x" * 125}).status_code == 400


def test_data_quality_rules_armenia_cameroon_kenya_senegal_and_map_seed():
    # 1. Map seed has 2,231 verified features across refreshed countries (including Home Depot Leaside 7073)
    map_res = client.get("/api/v1/market/map-seed")
    assert map_res.status_code == 200
    features = map_res.json()["features"]
    assert len(features) == 2231
    leaside = [f for f in features if f["properties"].get("branch_id") == "ca-home-depot-7073"]
    assert len(leaside) == 1

    # 2. Armenia: p001 (Erkat 2,700 AMD) is quarantined; SHINSHIN 3,800 AMD is lowest published cement price;
    #    Iranian origin (IR) is preserved on am-price-002;
    #    MM.am Leader ready_mix observations have unit=None (unit_unconfirmed) and are NOT ranked as cheapest.
    am_res = client.post(
        "/api/v1/market/search",
        json={
            "tab": "ingredients",
            "category": "cement",
            "country_code": "AM",
            "quantity": 1000,
            "unit": "kg",
            "sort_by": "lowest_published_price",
        },
    )
    assert am_res.status_code == 200
    am_body = am_res.json()
    am_offers = am_body["offers"]
    assert am_offers[0]["supplier_id"] == "am-shinshin"
    assert am_offers[0]["price_id"] == "am-price-001"
    assert all(o.get("price_id") != "p001" for o in am_offers)

    ir_offers = [o for o in am_offers if o.get("product_origin_country") == "IR"]
    assert len(ir_offers) >= 1

    am_rm_res = client.post(
        "/api/v1/market/search",
        json={
            "tab": "ready_mix",
            "category": "ready_mix",
            "country_code": "AM",
            "sort_by": "lowest_published_price",
        },
    ).json()
    mm_grade_offers = [
        o for o in am_rm_res["offers"]
        if o["supplier_id"] == "am-mmleader" and o.get("price_status") == "unit_unconfirmed"
    ]
    assert len(mm_grade_offers) == 9
    assert all(o["original_unit"] is None for o in mm_grade_offers)
    assert all(o["is_complete_total"] is False for o in mm_grade_offers)

    # 3. Cameroon: Retail (10 bags = 500 kg) vs Bulk 600+ bags (700 bags = 35,000 kg)
    cm_retail = client.post(
        "/api/v1/market/search",
        json={
            "tab": "ingredients",
            "category": "cement",
            "country_code": "CM",
            "quantity": 500,
            "unit": "kg",
            "sort_by": "lowest_published_price",
        },
    ).json()
    assert cm_retail["offers"][0]["price_id"] == "cm-mira-32.5R-retail"  # 5,100 XAF (min 1 bag)
    assert cm_retail["offers"][0]["quantity_tier_matched"] is True

    cm_bulk = client.post(
        "/api/v1/market/search",
        json={
            "tab": "ingredients",
            "category": "cement",
            "country_code": "CM",
            "quantity": 35000,
            "unit": "kg",
            "sort_by": "lowest_published_price",
        },
    ).json()
    assert cm_bulk["offers"][0]["price_id"] == "cm-mira-32.5R-bulk"  # 4,900 XAF (min 600 bags)
    assert cm_bulk["offers"][0]["quantity_tier_matched"] is True

    # 4. Kenya: ke-constructionhub is recommendation_eligible=False and never recommended
    ke_res = client.post(
        "/api/v1/market/search",
        json={"tab": "ingredients", "category": "cement", "country_code": "KE", "sort_by": "recommended"},
    ).json()
    chub = next(o for o in ke_res["offers"] if o["supplier_id"] == "ke-constructionhub")
    assert chub["recommendation_eligible"] is False
    assert chub["recommendation_badge"] is None
    assert ke_res["offers"][0]["supplier_id"] != "ke-constructionhub"

    # 5. Senegal: sn-price-058 stays in EUR and is a price range (not converted to XOF)
    sn_res = client.post(
        "/api/v1/market/search",
        json={"tab": "ingredients", "category": "cement", "country_code": "SN"},
    ).json()
    sn_range = next(o for o in sn_res["offers"] if o.get("price_id") == "sn-price-058")
    assert sn_range["original_currency"] == "EUR"
    assert sn_range["is_price_range"] is True
    assert sn_range["is_complete_total"] is False

    # 6. Manual location text entry does not inherit coordinates
    man_res = client.post(
        "/api/v1/market/search",
        json={
            "tab": "ingredients",
            "category": "cement",
            "country_code": "AM",
            "location_query": "Custom Unselected District",
            "manual_location_entry": True,
        },
    ).json()
    assert man_res["resolved_location"]["latitude"] is None
    assert man_res["resolved_location"]["longitude"] is None
    assert man_res["resolved_location"]["resolution_status"] == "manual_unverified_text"



@pytest.mark.parametrize("context", [None, {"region":"US","currency":"USD","unit_basis":"m3","scope":"ingredients_only"}, {"region":"AM","currency":"EUR","unit_basis":"m3","scope":"ingredients_only"}, {"region":"AM","currency":"USD","unit_basis":"tonne","scope":"ingredients_only"}])
def test_mismatched_cohort_never_gets_a_market_ranking(context):
    response = client.post("/api/v1/mix-lab/evaluate", json={"mix":VALID_MIX,
        "comparison_mode":"market_cohort", "pricing_region":"AM", "cohort_context":context,
        "market_cohort_costs":[100.] * 12, "market_cohort_emissions":[300.] * 12})
    assert response.status_code == 200
    assert response.json()["cards"]["estimated_ingredient_cost"]["status"] == "insufficient_comparison_data"


def test_non_usd_cannot_relabel_default_usd_prices():
    response = client.post("/api/v1/mix-lab/evaluate", json={"mix":VALID_MIX,"currency":"EUR"})
    assert response.status_code == 422


@pytest.mark.parametrize("identifiers", [None, ["same-observation"] * 12])
def test_cohort_requires_unique_observation_ids(identifiers):
    response = client.post("/api/v1/mix-lab/evaluate", json={"mix":VALID_MIX,
        "comparison_mode":"market_cohort", "pricing_region":"AM",
        "cohort_context":{"region":"AM","currency":"USD","unit_basis":"m3","scope":"ingredients_only"},
        "cohort_observation_ids":identifiers,"market_cohort_costs":[100.] * 12})
    assert response.status_code == 200
    assert response.json()["cards"]["estimated_ingredient_cost"]["status"] == "insufficient_comparison_data"


def test_zero_factors_and_missing_reference_factors_do_not_fall_back_to_defaults():
    from astramix.domain.input_schema import MATERIAL_FEATURE_ORDER
    zeros = dict.fromkeys(MATERIAL_FEATURE_ORDER, 0.)
    response = client.post("/api/v1/mix-lab/evaluate", json={"mix":VALID_MIX,
        "unit_costs":zeros,"emission_factors":zeros,"strict_custom_prices":True,"strict_custom_factors":True})
    assert response.status_code == 200
    for key in ["estimated_ingredient_cost", "estimated_embodied_emissions"]:
        card = response.json()["cards"][key]
        assert card["headline_value"] == 0
        assert card["comparison"]["reference_value"] is None
        assert card["color"] == "neutral"
    partial = {k:.1 for k in MATERIAL_FEATURE_ORDER if k != "superplasticizer"}
    response = client.post("/api/v1/mix-lab/evaluate", json={"mix":{**VALID_MIX,"superplasticizer":0},
        "unit_costs":partial,"strict_custom_prices":True})
    assert response.status_code == 200
    card = response.json()["cards"]["estimated_ingredient_cost"]
    assert card["is_complete"]
    assert card["comparison"]["reference_value"] is None

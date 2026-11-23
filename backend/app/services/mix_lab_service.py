"""
Mix Lab evaluation, comparison, and provenance service.

Implements the three primary result cards:
1. Predicted strength (with curing age, specimen convention, target vs no-target
   distribution context, and RMSE uncertainty band rule)
2. Estimated ingredient cost (Decimal arithmetic, incomplete-estimate handling
   when any active ingredient price is missing, market cohort >= 10 percentile
   bands vs 'Insufficient comparison data', and 'Compared with selected reference')
3. Estimated embodied emissions (incomplete-estimate handling when any active
   emission factor is missing, market cohort >= 10 percentile bands vs
   'Insufficient comparison data', and 'Compared with selected reference')
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from app.ml import strength_predictor
from app.schemas.common import MixComposition
from astramix.domain.input_schema import (
    CANONICAL_FEATURE_ORDER,
    MATERIAL_FEATURE_ORDER,
    SCHEMA_VERSION,
    check_split_comparison_notes,
    compute_water_binder_ratio,
    compute_water_cement_ratio,
    load_versioned_input_schema,
)
from astramix.sustainability.impact import DEFAULT_CO2_FACTORS, DEFAULT_COST_FACTORS

INGREDIENT_LABELS: Dict[str, str] = {
    "cement": "Cement",
    "blast_furnace_slag": "Blast furnace slag",
    "fly_ash": "Fly ash",
    "water": "Mixing water",
    "superplasticizer": "Superplasticizer",
    "coarse_aggregate": "Coarse aggregate",
    "fine_aggregate": "Fine aggregate",
}

BASELINE_REFERENCE_MIX: Dict[str, Any] = {
    "cement": 380.0,
    "blast_furnace_slag": 0.0,
    "fly_ash": 0.0,
    "water": 175.0,
    "superplasticizer": 2.5,
    "coarse_aggregate": 1040.0,
    "fine_aggregate": 760.0,
    "age": 28,
}


def _evaluate_strength_card(
    mix_dict: Dict[str, Any],
    pred_result: Dict[str, Any],
    target_strength_mpa: Optional[float] = None,
    target_strength_class: Optional[str] = None,
) -> Dict[str, Any]:
    pred_mpa = round(max(0.0, float(pred_result["predicted_strength_mpa"])), 2)
    age_days = int(mix_dict["age"])
    rmse_mpa = float(pred_result.get("estimated_error_rmse_mpa") or 4.62)
    mae_mpa = float(pred_result.get("estimated_error_mae_mpa") or 3.03)

    schema = load_versioned_input_schema()
    target_ref = schema.get("target_reference", {})
    strength_classes = {
        sc["code"].upper(): sc for sc in schema.get("strength_classes", [])
    }

    age_label = (
        "Predicted 28-day compressive strength"
        if age_days == 28
        else f"Predicted {age_days}-day compressive strength (non-standard curing age; standard reference classes are defined at 28 days)"
    )

    class_info = None
    if target_strength_class:
        sc_key = target_strength_class.strip().upper()
        if sc_key in strength_classes:
            class_info = strength_classes[sc_key]
            if target_strength_mpa is None:
                target_strength_mpa = float(class_info["cylinder_mpa"])

    specimen_note = (
        class_info["note"]
        if class_info
        else "UCI model predicts laboratory cylinder compressive strength (MPa). EN 206 classes (e.g. C25/30) list cylinder/cube strength at 28 days."
    )

    if target_strength_mpa is not None:
        target_val = round(float(target_strength_mpa), 2)
        delta_mpa = round(pred_mpa - target_val, 2)
        delta_pct = round((delta_mpa / target_val) * 100.0, 2) if target_val > 0 else 0.0

        if pred_mpa >= target_val + rmse_mpa:
            status = "meets_target_with_margin"
            color = "green"
            badge = "Meets target (above RMSE margin)"
            summary = (
                f"{delta_mpa:+.2f} MPa ({delta_pct:+.1f}%) vs {target_val:.2f} MPa target at {age_days} days — "
                f"exceeds target by more than model validation RMSE (±{rmse_mpa:.2f} MPa)."
            )
        elif pred_mpa >= target_val:
            status = "meets_target_within_uncertainty"
            color = "yellow"
            badge = "Caution: within model RMSE"
            summary = (
                f"{delta_mpa:+.2f} MPa ({delta_pct:+.1f}%) vs {target_val:.2f} MPa target at {age_days} days — "
                f"barely meets target within model validation error (RMSE ±{rmse_mpa:.2f} MPa; MAE ±{mae_mpa:.2f} MPa)."
            )
        else:
            status = "below_target"
            color = "red"
            badge = "Below target strength"
            summary = (
                f"{delta_mpa:+.2f} MPa ({delta_pct:+.1f}%) below {target_val:.2f} MPa target at {age_days} days."
            )

        comparison = {
            "mode": "target_strength",
            "target_strength_mpa": target_val,
            "target_strength_class": class_info["code"] if class_info else target_strength_class,
            "target_curing_age_days": age_days,
            "delta_mpa": delta_mpa,
            "delta_pct": delta_pct,
            "rmse_margin_mpa": rmse_mpa,
            "mae_margin_mpa": mae_mpa,
        }
    else:
        status = "neutral_context"
        color = "neutral"
        badge = "Training distribution context"
        pcts = (
            target_ref.get("percentiles_28_days", {})
            if age_days == 28
            else target_ref.get("percentiles_all_ages", {})
        )
        p25 = float(pcts.get("p25", 23.71))
        p50 = float(pcts.get("p50", 34.45))
        p75 = float(pcts.get("p75", 46.14))
        obs_min = float(target_ref.get("min", 2.33))
        obs_max = float(target_ref.get("max", 82.60))

        if pred_mpa < p25:
            pos_desc = f"in the lower quartile (< {p25:.1f} MPa)"
        elif pred_mpa <= p75:
            pos_desc = f"in the middle 50% interquartile range ({p25:.1f}–{p75:.1f} MPa, median {p50:.1f} MPa)"
        else:
            pos_desc = f"in the upper quartile (> {p75:.1f} MPa)"

        summary = (
            f"No target strength specified. Predicted {pred_mpa:.2f} MPa at {age_days} days sits {pos_desc} "
            f"of the model's observed training range ({obs_min:.2f}–{obs_max:.2f} MPa)."
        )
        comparison = {
            "mode": "training_distribution_context",
            "observed_min_mpa": obs_min,
            "observed_max_mpa": obs_max,
            "p25_mpa": p25,
            "median_p50_mpa": p50,
            "p75_mpa": p75,
            "rmse_margin_mpa": rmse_mpa,
            "mae_margin_mpa": mae_mpa,
        }

    rating_label_map = {
        "green": "Good",
        "yellow": "Normal",
        "red": "Poor",
        "neutral": "Not enough comparable data",
    }

    return {
        "card_type": "predicted_strength",
        "title": "Predicted strength",
        "headline_value": pred_mpa,
        "unit": "MPa",
        "curing_age_days": age_days,
        "age_label": age_label,
        "status": status,
        "color": color,
        "rating_label": rating_label_map.get(color, "Not enough comparable data"),
        "badge": badge,
        "summary": summary,
        "specimen_convention_note": specimen_note,
        "comparison": comparison,
        "details": {
            "water_cement_ratio": round(compute_water_cement_ratio(float(mix_dict["water"]), float(mix_dict["cement"])), 4),
            "water_binder_ratio": round(
                compute_water_binder_ratio(
                    float(mix_dict["water"]),
                    float(mix_dict["cement"]),
                    float(mix_dict["blast_furnace_slag"]),
                    float(mix_dict["fly_ash"]),
                ),
                4,
            ),
            "model_version": pred_result.get("model_version", "v0.1"),
            "estimated_error_rmse_mpa": rmse_mpa,
            "estimated_error_mae_mpa": mae_mpa,
            "confidence_note": pred_result.get("confidence_note"),
            "warnings": pred_result.get("warnings", []) + check_split_comparison_notes(mix_dict),
        },
    }


def _evaluate_cost_or_emissions_comparison(
    value: float,
    unit_str: str,
    comparison_mode: str,
    market_cohort_values: Optional[List[float]],
    reference_value: Optional[float],
    reference_label: str,
    tolerance_pct: float,
) -> Tuple[str, str, str, str, Dict[str, Any]]:
    """
    Shared comparison engine for Cost and Embodied Emissions:
    - 'market_cohort': requires >= 10 independent compatible observations for P25/P50/P75;
      otherwise returns neutral 'Insufficient comparison data'.
    - 'selected_reference': compares against user-selected reference with configurable
      tolerance_pct, labeled 'Compared with selected reference'.
    """
    mode = (comparison_mode or "selected_reference").strip().lower()

    if mode == "market_cohort":
        cohort = [float(v) for v in (market_cohort_values or []) if v is not None and np.isfinite(v)]
        n = len(cohort)
        if n < 10:
            return (
                "insufficient_comparison_data",
                "neutral",
                "Insufficient comparison data",
                (
                    f"Insufficient comparison data: found {n} compatible independent market observations "
                    f"(at least 10 observations matching currency, region, unit, and scope are required to show percentile bands)."
                ),
                {
                    "mode": "market_cohort",
                    "observation_count": n,
                    "min_required_observations": 10,
                    "sufficient_data": False,
                    "p25": None,
                    "median_p50": None,
                    "p75": None,
                },
            )
        p25 = round(float(np.percentile(cohort, 25)), 2)
        p50 = round(float(np.percentile(cohort, 50)), 2)
        p75 = round(float(np.percentile(cohort, 75)), 2)
        delta_vs_median = round(value - p50, 2)
        delta_pct_median = round((delta_vs_median / p50) * 100.0, 2) if p50 > 0 else 0.0

        if value < p25:
            status = "favorable_below_p25"
            color = "green"
            badge = "Below 25th percentile (favorable)"
            summary = (
                f"{value:.2f} {unit_str} is below the 25th percentile ({p25:.2f} {unit_str}; "
                f"median {p50:.2f} {unit_str}, {delta_pct_median:+.1f}% vs median across {n} observations)."
            )
        elif value <= p75:
            status = "typical_p25_to_p75"
            color = "yellow"
            badge = "25th–75th percentile (typical)"
            summary = (
                f"{value:.2f} {unit_str} is within the typical 25th–75th percentile band "
                f"({p25:.2f}–{p75:.2f} {unit_str}; median {p50:.2f} {unit_str}, {delta_pct_median:+.1f}% vs median across {n} observations)."
            )
        else:
            status = "high_above_p75"
            color = "red"
            badge = "Above 75th percentile (high)"
            summary = (
                f"{value:.2f} {unit_str} is above the 75th percentile ({p75:.2f} {unit_str}; "
                f"median {p50:.2f} {unit_str}, {delta_pct_median:+.1f}% vs median across {n} observations)."
            )

        return (
            status,
            color,
            badge,
            summary,
            {
                "mode": "market_cohort",
                "observation_count": n,
                "min_required_observations": 10,
                "sufficient_data": True,
                "p25": p25,
                "median_p50": p50,
                "p75": p75,
                "delta_vs_median": delta_vs_median,
                "delta_pct_vs_median": delta_pct_median,
            },
        )

    # Selected reference comparison mode
    if reference_value is None or reference_value <= 0:
        return (
            "neutral_no_reference",
            "neutral",
            "No reference selected",
            f"Estimated {value:.2f} {unit_str}. Select a reference mix or target to compare.",
            {
                "mode": "selected_reference",
                "comparison_label": "Compared with selected reference",
                "reference_value": None,
                "tolerance_pct": tolerance_pct,
            },
        )

    ref_val = round(float(reference_value), 2)
    delta = round(value - ref_val, 2)
    delta_pct = round((delta / ref_val) * 100.0, 2)

    if delta_pct < -tolerance_pct:
        status = "lower_than_reference"
        color = "green"
        badge = "Compared with selected reference: Lower"
        summary = (
            f"Compared with selected reference ({reference_label}: {ref_val:.2f} {unit_str}): "
            f"{delta:+.2f} {unit_str} ({delta_pct:+.1f}%, more than {tolerance_pct:.1f}% lower)."
        )
    elif abs(delta_pct) <= tolerance_pct:
        status = "similar_to_reference"
        color = "yellow"
        badge = "Compared with selected reference: Similar"
        summary = (
            f"Compared with selected reference ({reference_label}: {ref_val:.2f} {unit_str}): "
            f"{delta:+.2f} {unit_str} ({delta_pct:+.1f}%, within ±{tolerance_pct:.1f}% tolerance band)."
        )
    else:
        status = "higher_than_reference"
        color = "red"
        badge = "Compared with selected reference: Higher"
        summary = (
            f"Compared with selected reference ({reference_label}: {ref_val:.2f} {unit_str}): "
            f"{delta:+.2f} {unit_str} ({delta_pct:+.1f}%, more than {tolerance_pct:.1f}% higher)."
        )

    return (
        status,
        color,
        badge,
        summary,
        {
            "mode": "selected_reference",
            "comparison_label": "Compared with selected reference",
            "reference_label": reference_label,
            "reference_value": ref_val,
            "delta": delta,
            "delta_pct": delta_pct,
            "tolerance_pct": tolerance_pct,
        },
    )


def evaluate_cost_card(
    mix_dict: Dict[str, Any],
    unit_costs: Optional[Dict[str, Optional[float]]] = None,
    strict_custom_prices: bool = False,
    currency: str = "USD",
    comparison_mode: str = "selected_reference",
    market_cohort_costs: Optional[List[float]] = None,
    reference_mix: Optional[Dict[str, Any]] = None,
    reference_cost_per_m3: Optional[float] = None,
    reference_label: str = "Baseline OPC 380 kg/m³ reference mix",
    tolerance_pct: float = 5.0,
) -> Dict[str, Any]:
    """
    Evaluate Card 2: Estimated ingredient cost per m³.
    Never treats missing ingredient prices as 0; marks incomplete estimates as
    'Incomplete ingredient cost estimate' with neutral styling and coverage metrics.
    """
    curr = (currency or "USD").upper().strip()
    price_table: Dict[str, Optional[float]] = {}
    for mat in MATERIAL_FEATURE_ORDER:
        if strict_custom_prices:
            price_table[mat] = unit_costs.get(mat) if unit_costs else None
        else:
            if unit_costs and mat in unit_costs:
                price_table[mat] = unit_costs[mat]
            else:
                price_table[mat] = float(DEFAULT_COST_FACTORS[mat])

    breakdown: Dict[str, Optional[float]] = {}
    line_items: List[Dict[str, Any]] = []
    missing_ingredients: List[str] = []

    total_mass_dec = Decimal("0")
    priced_mass_dec = Decimal("0")
    known_subtotal_dec = Decimal("0")
    active_count = 0
    priced_count = 0

    for mat in MATERIAL_FEATURE_ORDER:
        qty_dec = Decimal(str(mix_dict.get(mat, 0.0)))
        if qty_dec <= Decimal("0"):
            breakdown[mat] = 0.0
            continue

        active_count += 1
        total_mass_dec += qty_dec
        u_price = price_table.get(mat)

        if u_price is None or not np.isfinite(float(u_price)) or float(u_price) < 0:
            missing_ingredients.append(mat)
            breakdown[mat] = None
            line_items.append({
                "material": mat,
                "label": INGREDIENT_LABELS.get(mat, mat),
                "quantity_kg_per_m3": float(qty_dec),
                "unit_price_per_kg": None,
                "cost_per_m3": None,
                "status": "missing_price",
            })
        else:
            up_dec = Decimal(str(u_price))
            item_cost = (qty_dec * up_dec).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            known_subtotal_dec += item_cost
            priced_mass_dec += qty_dec
            priced_count += 1
            breakdown[mat] = float(item_cost)
            line_items.append({
                "material": mat,
                "label": INGREDIENT_LABELS.get(mat, mat),
                "quantity_kg_per_m3": float(qty_dec),
                "unit_price_per_kg": float(up_dec),
                "cost_per_m3": float(item_cost),
                "status": "priced",
            })

    coverage_ratio = (
        round(float(priced_mass_dec / total_mass_dec), 4)
        if total_mass_dec > Decimal("0")
        else 1.0
    )
    known_subtotal = float(known_subtotal_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    is_complete = len(missing_ingredients) == 0

    if not is_complete:
        missing_labels = [INGREDIENT_LABELS.get(m, m) for m in missing_ingredients]
        return {
            "card_type": "estimated_ingredient_cost",
            "title": "Estimated ingredient cost",
            "scope_label": "Ingredient-only estimate per m³ (excludes batching plant overhead, delivery, and tax)",
            "is_complete": False,
            "headline_value": None,
            "known_subtotal_per_m3": known_subtotal,
            "currency": curr,
            "unit": f"{curr}/m³",
            "status": "incomplete",
            "color": "neutral",
            "rating_label": "Not enough comparable data",
            "badge": "Incomplete ingredient cost estimate",
            "summary": (
                f"Incomplete ingredient cost estimate: known subtotal is {known_subtotal:.2f} {curr}/m³ "
                f"covering {coverage_ratio*100:.1f}% of mix mass ({priced_count}/{active_count} active ingredients). "
                f"Missing prices for: {', '.join(missing_labels)} (never assumed to be zero)."
            ),
            "coverage": {
                "priced_mass_kg_per_m3": float(priced_mass_dec),
                "total_mass_kg_per_m3": float(total_mass_dec),
                "priced_mass_coverage_ratio": coverage_ratio,
                "priced_ingredient_count": priced_count,
                "active_ingredient_count": active_count,
                "missing_ingredients": missing_ingredients,
            },
            "comparison": {
                "mode": comparison_mode,
                "status": "blocked_incomplete_estimate",
                "note": "Percentile or reference ranking is disabled when ingredient prices are missing.",
            },
            "details": {
                "breakdown_per_m3": breakdown,
                "line_items": line_items,
            },
        }

    # Compute reference cost if needed
    ref_val = reference_cost_per_m3
    if ref_val is None and comparison_mode == "selected_reference":
        ref_mix_used = reference_mix or BASELINE_REFERENCE_MIX
        ref_dec = Decimal("0")
        for mat in MATERIAL_FEATURE_ORDER:
            q_ref = Decimal(str(ref_mix_used.get(mat, 0.0)))
            p_ref = Decimal(str(price_table.get(mat) or DEFAULT_COST_FACTORS[mat]))
            ref_dec += q_ref * p_ref
        ref_val = float(ref_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    status, color, badge, summary, comp_dict = _evaluate_cost_or_emissions_comparison(
        value=known_subtotal,
        unit_str=f"{curr}/m³",
        comparison_mode=comparison_mode,
        market_cohort_values=market_cohort_costs,
        reference_value=ref_val,
        reference_label=reference_label,
        tolerance_pct=tolerance_pct,
    )
    rating_label_map = {
        "green": "Good",
        "yellow": "Normal",
        "red": "Poor",
        "neutral": "Not enough comparable data",
    }

    return {
        "card_type": "estimated_ingredient_cost",
        "title": "Estimated ingredient cost",
        "scope_label": "Ingredient-only estimate per m³ (excludes batching plant overhead, delivery, and tax)",
        "is_complete": True,
        "headline_value": known_subtotal,
        "known_subtotal_per_m3": known_subtotal,
        "currency": curr,
        "unit": f"{curr}/m³",
        "status": status,
        "color": color,
        "rating_label": rating_label_map.get(color, "Not enough comparable data"),
        "badge": badge,
        "summary": summary,
        "coverage": {
            "priced_mass_kg_per_m3": float(priced_mass_dec),
            "total_mass_kg_per_m3": float(total_mass_dec),
            "priced_mass_coverage_ratio": 1.0,
            "priced_ingredient_count": priced_count,
            "active_ingredient_count": active_count,
            "missing_ingredients": [],
        },
        "comparison": comp_dict,
        "details": {
            "breakdown_per_m3": breakdown,
            "line_items": line_items,
        },
    }


def evaluate_emissions_card(
    mix_dict: Dict[str, Any],
    emission_factors: Optional[Dict[str, Optional[float]]] = None,
    strict_custom_factors: bool = False,
    comparison_mode: str = "selected_reference",
    market_cohort_emissions: Optional[List[float]] = None,
    reference_mix: Optional[Dict[str, Any]] = None,
    reference_co2_kg_per_m3: Optional[float] = None,
    reference_label: str = "Baseline OPC 380 kg/m³ reference mix",
    tolerance_pct: float = 5.0,
) -> Dict[str, Any]:
    """
    Evaluate Card 3: Estimated embodied emissions (kg CO2e / m³).
    Never treats missing emission factors as 0; marks incomplete estimates as
    'Incomplete embodied emissions estimate' with neutral styling and coverage metrics.
    """
    factor_table: Dict[str, Optional[float]] = {}
    for mat in MATERIAL_FEATURE_ORDER:
        if strict_custom_factors:
            factor_table[mat] = emission_factors.get(mat) if emission_factors else None
        else:
            if emission_factors and mat in emission_factors:
                factor_table[mat] = emission_factors[mat]
            else:
                factor_table[mat] = float(DEFAULT_CO2_FACTORS[mat])

    breakdown: Dict[str, Optional[float]] = {}
    line_items: List[Dict[str, Any]] = []
    missing_ingredients: List[str] = []

    total_mass_dec = Decimal("0")
    covered_mass_dec = Decimal("0")
    known_subtotal_dec = Decimal("0")
    active_count = 0
    covered_count = 0

    for mat in MATERIAL_FEATURE_ORDER:
        qty_dec = Decimal(str(mix_dict.get(mat, 0.0)))
        if qty_dec <= Decimal("0"):
            breakdown[mat] = 0.0
            continue

        active_count += 1
        total_mass_dec += qty_dec
        ef = factor_table.get(mat)

        if ef is None or not np.isfinite(float(ef)) or float(ef) < 0:
            missing_ingredients.append(mat)
            breakdown[mat] = None
            line_items.append({
                "material": mat,
                "label": INGREDIENT_LABELS.get(mat, mat),
                "quantity_kg_per_m3": float(qty_dec),
                "factor_kg_co2e_per_kg": None,
                "co2_kg_per_m3": None,
                "status": "missing_factor",
            })
        else:
            ef_dec = Decimal(str(ef))
            item_co2 = (qty_dec * ef_dec).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
            known_subtotal_dec += item_co2
            covered_mass_dec += qty_dec
            covered_count += 1
            breakdown[mat] = float(item_co2)
            line_items.append({
                "material": mat,
                "label": INGREDIENT_LABELS.get(mat, mat),
                "quantity_kg_per_m3": float(qty_dec),
                "factor_kg_co2e_per_kg": float(ef_dec),
                "co2_kg_per_m3": float(item_co2),
                "status": "covered",
            })

    coverage_ratio = (
        round(float(covered_mass_dec / total_mass_dec), 4)
        if total_mass_dec > Decimal("0")
        else 1.0
    )
    known_subtotal = float(known_subtotal_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    is_complete = len(missing_ingredients) == 0

    if not is_complete:
        missing_labels = [INGREDIENT_LABELS.get(m, m) for m in missing_ingredients]
        return {
            "card_type": "estimated_embodied_emissions",
            "title": "Estimated embodied emissions",
            "scope_label": "Cradle-to-gate (A1–A3) material embodied carbon per m³",
            "is_complete": False,
            "headline_value": None,
            "known_subtotal_co2_kg_per_m3": known_subtotal,
            "unit": "kg CO₂e/m³",
            "status": "incomplete",
            "color": "neutral",
            "rating_label": "Not enough comparable data",
            "badge": "Incomplete embodied emissions estimate",
            "summary": (
                f"Incomplete embodied emissions estimate: known subtotal is {known_subtotal:.2f} kg CO₂e/m³ "
                f"covering {coverage_ratio*100:.1f}% of mix mass ({covered_count}/{active_count} active ingredients). "
                f"Missing emission factors for: {', '.join(missing_labels)} (never assumed to be zero)."
            ),
            "coverage": {
                "covered_mass_kg_per_m3": float(covered_mass_dec),
                "total_mass_kg_per_m3": float(total_mass_dec),
                "covered_mass_ratio": coverage_ratio,
                "covered_ingredient_count": covered_count,
                "active_ingredient_count": active_count,
                "missing_ingredients": missing_ingredients,
            },
            "comparison": {
                "mode": comparison_mode,
                "status": "blocked_incomplete_estimate",
                "note": "Percentile or reference ranking is disabled when emission factors are missing.",
            },
            "details": {
                "breakdown_kg_per_m3": breakdown,
                "line_items": line_items,
            },
        }

    ref_val = reference_co2_kg_per_m3
    if ref_val is None and comparison_mode == "selected_reference":
        ref_mix_used = reference_mix or BASELINE_REFERENCE_MIX
        ref_dec = Decimal("0")
        for mat in MATERIAL_FEATURE_ORDER:
            q_ref = Decimal(str(ref_mix_used.get(mat, 0.0)))
            f_ref = Decimal(str(factor_table.get(mat) or DEFAULT_CO2_FACTORS[mat]))
            ref_dec += q_ref * f_ref
        ref_val = float(ref_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    status, color, badge, summary, comp_dict = _evaluate_cost_or_emissions_comparison(
        value=known_subtotal,
        unit_str="kg CO₂e/m³",
        comparison_mode=comparison_mode,
        market_cohort_values=market_cohort_emissions,
        reference_value=ref_val,
        reference_label=reference_label,
        tolerance_pct=tolerance_pct,
    )
    rating_label_map = {
        "green": "Good",
        "yellow": "Normal",
        "red": "Poor",
        "neutral": "Not enough comparable data",
    }

    return {
        "card_type": "estimated_embodied_emissions",
        "title": "Estimated embodied emissions",
        "scope_label": "Cradle-to-gate (A1–A3) material embodied carbon per m³",
        "is_complete": True,
        "headline_value": known_subtotal,
        "known_subtotal_co2_kg_per_m3": known_subtotal,
        "unit": "kg CO₂e/m³",
        "status": status,
        "color": color,
        "rating_label": rating_label_map.get(color, "Not enough comparable data"),
        "badge": badge,
        "summary": summary,
        "coverage": {
            "covered_mass_kg_per_m3": float(covered_mass_dec),
            "total_mass_kg_per_m3": float(total_mass_dec),
            "covered_mass_ratio": 1.0,
            "covered_ingredient_count": covered_count,
            "active_ingredient_count": active_count,
            "missing_ingredients": [],
        },
        "comparison": comp_dict,
        "details": {
            "breakdown_kg_per_m3": breakdown,
            "line_items": line_items,
        },
    }


def evaluate_mix_lab(
    mix: MixComposition,
    target_strength_mpa: Optional[float] = None,
    target_strength_class: Optional[str] = None,
    comparison_mode: str = "selected_reference",
    tolerance_pct: float = 5.0,
    currency: str = "USD",
    unit_costs: Optional[Dict[str, Optional[float]]] = None,
    strict_custom_prices: bool = False,
    emission_factors: Optional[Dict[str, Optional[float]]] = None,
    strict_custom_factors: bool = False,
    market_cohort_costs: Optional[List[float]] = None,
    market_cohort_emissions: Optional[List[float]] = None,
    reference_mix: Optional[Dict[str, Any]] = None,
    reference_cost_per_m3: Optional[float] = None,
    reference_co2_kg_per_m3: Optional[float] = None,
    reference_label: str = "Baseline OPC 380 kg/m³ reference mix",
    price_source_id: str = "ASTRAMIX_ENGINEERING_REF_V1",
    emission_factor_set_id: str = "ICE_V3_CRADLE_TO_GATE_A1_A3",
) -> Dict[str, Any]:
    """
    Complete Mix Lab evaluation returning the 3 primary result cards and
    full calculation provenance.
    """
    mix_dict = {f: getattr(mix, f) for f in CANONICAL_FEATURE_ORDER}
    pred_result = strength_predictor.predict_with_trust(mix)

    strength_card = _evaluate_strength_card(
        mix_dict=mix_dict,
        pred_result=pred_result,
        target_strength_mpa=target_strength_mpa,
        target_strength_class=target_strength_class,
    )

    cost_card = evaluate_cost_card(
        mix_dict=mix_dict,
        unit_costs=unit_costs,
        strict_custom_prices=strict_custom_prices,
        currency=currency,
        comparison_mode=comparison_mode,
        market_cohort_costs=market_cohort_costs,
        reference_mix=reference_mix,
        reference_cost_per_m3=reference_cost_per_m3,
        reference_label=reference_label,
        tolerance_pct=tolerance_pct,
    )

    emissions_card = evaluate_emissions_card(
        mix_dict=mix_dict,
        emission_factors=emission_factors,
        strict_custom_factors=strict_custom_factors,
        comparison_mode=comparison_mode,
        market_cohort_emissions=market_cohort_emissions,
        reference_mix=reference_mix,
        reference_co2_kg_per_m3=reference_co2_kg_per_m3,
        reference_label=reference_label,
        tolerance_pct=tolerance_pct,
    )

    provenance = {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": SCHEMA_VERSION,
        "model_id": "xgboost_baseline_uci_1030",
        "model_version": pred_result.get("model_version", "v0.1"),
        "curing_age_days": int(mix.age),
        "water_cement_ratio": mix.water_cement_ratio,
        "water_binder_ratio": mix.water_binder_ratio,
        "price_source_id": price_source_id,
        "currency": (currency or "USD").upper(),
        "emission_factor_set_id": emission_factor_set_id,
        "system_boundary": "Cradle-to-Gate (A1–A3) concrete constituent ingredients",
        "comparison_mode": comparison_mode,
        "tolerance_pct": tolerance_pct,
        "reference_label": reference_label if comparison_mode == "selected_reference" else "Market cohort",
        "market_cost_observation_count": len(market_cohort_costs or []),
        "market_emission_observation_count": len(market_cohort_emissions or []),
        "missing_cost_fields": cost_card["coverage"]["missing_ingredients"],
        "missing_emission_fields": emissions_card["coverage"]["missing_ingredients"],
    }

    return {
        "success": True,
        "mix": mix_dict,
        "cards": {
            "predicted_strength": strength_card,
            "estimated_ingredient_cost": cost_card,
            "estimated_embodied_emissions": emissions_card,
        },
        "provenance": provenance,
    }

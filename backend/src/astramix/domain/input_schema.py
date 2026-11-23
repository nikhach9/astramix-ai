"""
Versioned Mix Lab Input Validation Contract (v1.0.0).

Single source of truth for feature ranges, curing age rules, water/cement
and water/binder ratio formulas, and optimization constraint bounds across
prediction, optimization, evaluation, report generation, and API endpoints.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SCHEMA_VERSION = "1.0.0"

CANONICAL_FEATURE_ORDER: Tuple[str, ...] = (
    "cement",
    "blast_furnace_slag",
    "fly_ash",
    "water",
    "superplasticizer",
    "coarse_aggregate",
    "fine_aggregate",
    "age",
)

MATERIAL_FEATURE_ORDER: Tuple[str, ...] = (
    "cement",
    "blast_furnace_slag",
    "fly_ash",
    "water",
    "superplasticizer",
    "coarse_aggregate",
    "fine_aggregate",
)

ACTIVE_FEATURE_BOUNDS: Dict[str, Dict[str, Any]] = {
    "cement": {
        "name": "cement",
        "label": "Cement",
        "unit": "kg/m³",
        "type": "float",
        "required": True,
        "min": 102.0,
        "max": 540.0,
        "step_default": 1.0,
        "default_value": 350.0,
        "uci_reference_bounds": {"min": 102.0, "max": 540.0},
        "processed_csv_bounds": {"min": 102.0, "max": 540.0},
        "train_split_bounds": {"min": 102.0, "max": 540.0},
        "split_differs_from_reference": False,
    },
    "blast_furnace_slag": {
        "name": "blast_furnace_slag",
        "label": "Blast furnace slag",
        "unit": "kg/m³",
        "type": "float",
        "required": True,
        "min": 0.0,
        "max": 359.4,
        "step_default": 1.0,
        "default_value": 0.0,
        "uci_reference_bounds": {"min": 0.0, "max": 359.4},
        "processed_csv_bounds": {"min": 0.0, "max": 359.4},
        "train_split_bounds": {"min": 0.0, "max": 359.4},
        "split_differs_from_reference": False,
    },
    "fly_ash": {
        "name": "fly_ash",
        "label": "Fly ash",
        "unit": "kg/m³",
        "type": "float",
        "required": True,
        "min": 0.0,
        "max": 200.1,
        "step_default": 1.0,
        "default_value": 0.0,
        "uci_reference_bounds": {"min": 0.0, "max": 200.1},
        "processed_csv_bounds": {"min": 0.0, "max": 200.1},
        "train_split_bounds": {"min": 0.0, "max": 195.0},
        "split_differs_from_reference": True,
        "split_difference_note": (
            "Full 1,030-row UCI reference max is 200.1 kg/m³; "
            "80% random_state=42 train split max is 195.0 kg/m³."
        ),
    },
    "water": {
        "name": "water",
        "label": "Mixing water",
        "unit": "kg/m³",
        "type": "float",
        "required": True,
        "min": 121.75,
        "max": 247.0,
        "step_default": 0.5,
        "default_value": 175.0,
        "uci_reference_bounds": {"min": 121.75, "max": 247.0},
        "processed_csv_bounds": {"min": 121.8, "max": 247.0},
        "train_split_bounds": {"min": 121.8, "max": 247.0},
        "split_differs_from_reference": True,
        "split_difference_note": (
            "Exact UCI Excel minimum is 121.75 kg/m³; "
            "processed CSV rounded 121.75 to 121.8 kg/m³."
        ),
    },
    "superplasticizer": {
        "name": "superplasticizer",
        "label": "Superplasticizer",
        "unit": "kg/m³",
        "type": "float",
        "required": True,
        "min": 0.0,
        "max": 32.2,
        "step_default": 0.1,
        "default_value": 3.5,
        "uci_reference_bounds": {"min": 0.0, "max": 32.2},
        "processed_csv_bounds": {"min": 0.0, "max": 32.2},
        "train_split_bounds": {"min": 0.0, "max": 32.2},
        "split_differs_from_reference": False,
    },
    "coarse_aggregate": {
        "name": "coarse_aggregate",
        "label": "Coarse aggregate",
        "unit": "kg/m³",
        "type": "float",
        "required": True,
        "min": 801.0,
        "max": 1145.0,
        "step_default": 1.0,
        "default_value": 1020.0,
        "uci_reference_bounds": {"min": 801.0, "max": 1145.0},
        "processed_csv_bounds": {"min": 801.0, "max": 1145.0},
        "train_split_bounds": {"min": 801.0, "max": 1145.0},
        "split_differs_from_reference": False,
    },
    "fine_aggregate": {
        "name": "fine_aggregate",
        "label": "Fine aggregate",
        "unit": "kg/m³",
        "type": "float",
        "required": True,
        "min": 594.0,
        "max": 992.6,
        "step_default": 1.0,
        "default_value": 760.0,
        "uci_reference_bounds": {"min": 594.0, "max": 992.6},
        "processed_csv_bounds": {"min": 594.0, "max": 992.6},
        "train_split_bounds": {"min": 594.0, "max": 992.6},
        "split_differs_from_reference": False,
    },
    "age": {
        "name": "age",
        "label": "Curing age",
        "unit": "days",
        "type": "integer",
        "required": True,
        "min": 1,
        "max": 365,
        "step_default": 1,
        "default_value": 28,
        "common_presets": [1, 3, 7, 14, 28, 56, 90, 180, 365],
        "uci_reference_bounds": {"min": 1, "max": 365},
        "processed_csv_bounds": {"min": 1, "max": 365},
        "train_split_bounds": {"min": 1, "max": 365},
        "split_differs_from_reference": False,
    },
}

LEGACY_FIELD_ALIASES = {
    "slag": "blast_furnace_slag",
    "ash": "fly_ash",
    "superplastic": "superplasticizer",
    "coarseagg": "coarse_aggregate",
    "fineagg": "fine_aggregate",
    "curing_age_days": "age",
    "age_days": "age",
    "ageDays": "age",
}


def get_schema_artifact_path() -> Path:
    project_root = Path(__file__).resolve().parents[4]
    model_root = project_root / "artifacts/models/strength"
    active = model_root / "active_model.json"
    if active.exists():
        return model_root / json.loads(active.read_text())["schema_path"]
    return model_root / "baseline/input_schema_v1.json"


def load_versioned_input_schema() -> Dict[str, Any]:
    path = get_schema_artifact_path()
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "schema_version": SCHEMA_VERSION,
        "model_version": "unversioned",
        "best_model_name": None,
        "canonical_feature_order": list(CANONICAL_FEATURE_ORDER),
        "features": ACTIVE_FEATURE_BOUNDS,
    }


def parse_strict_finite_float(value: Any, field_name: str, label: str) -> float:
    """Parse a finite float without accepting booleans, NaN, Infinity, or empty strings."""
    if value is None:
        raise ValueError(f"{label} ({field_name}) is required.")
    if isinstance(value, bool):
        raise ValueError(f"{label} ({field_name}) must be a valid finite number, not a boolean.")
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise ValueError(f"{label} ({field_name}) is required.")
        lowered = stripped.lower()
        if lowered in ("nan", "inf", "+inf", "-inf", "infinity", "+infinity", "-infinity"):
            raise ValueError(f"{label} ({field_name}) must be a finite number (NaN/Infinity not allowed).")
        try:
            num = float(stripped)
        except ValueError as exc:
            raise ValueError(f"{label} ({field_name}) must be a valid finite number.") from exc
    elif isinstance(value, (int, float)):
        num = float(value)
    else:
        raise ValueError(f"{label} ({field_name}) must be a valid finite number.")

    if not math.isfinite(num):
        raise ValueError(f"{label} ({field_name}) must be a finite number (NaN/Infinity not allowed).")
    return num


def parse_strict_integer_age(value: Any, field_name: str = "age", label: str = "Curing age") -> int:
    """Parse curing age strictly as an integer in days; reject fractional numbers."""
    num = parse_strict_finite_float(value, field_name, label)
    if isinstance(value, str):
        stripped = value.strip()
        if "." in stripped:
            # Check if fractional part is non-zero
            if not num.is_integer():
                raise ValueError(
                    f"{label} ({field_name}) must be a whole integer number of days (received fractional value {value})."
                )
            # Even "28.5" vs "28.0": reject explicit decimal strings if fractional
    if not num.is_integer():
        raise ValueError(
            f"{label} ({field_name}) must be a whole integer number of days (received fractional value {value})."
        )
    return int(num)


def compute_water_cement_ratio(water: float, cement: float) -> float:
    """Explicitly compute water / cement (excludes slag and fly ash)."""
    if cement <= 0:
        raise ValueError("Cement content must be strictly positive (cement > 0) to compute water/cement ratio.")
    return water / cement


def compute_water_binder_ratio(
    water: float,
    cement: float,
    blast_furnace_slag: float,
    fly_ash: float,
) -> float:
    """Explicitly compute water / (cement + blast_furnace_slag + fly_ash)."""
    binder = cement + blast_furnace_slag + fly_ash
    if binder <= 0:
        raise ValueError(
            "Total binder content (cement + blast_furnace_slag + fly_ash) must be > 0 to compute water/binder ratio."
        )
    return water / binder


def validate_mix_dict_strict(raw_mix: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Validate a mix dictionary against the versioned v1.0.0 input contract.
    Never silently clamps values. Returns (cleaned_mix, field_errors).
    """
    if not isinstance(raw_mix, dict):
        return {}, [{"loc": ["mix"], "msg": "Mix must be a JSON object.", "type": "type_error"}]

    errors: List[Dict[str, Any]] = []
    cleaned: Dict[str, Any] = {}

    # 1. Check unknown / legacy fields
    for key in raw_mix.keys():
        if key not in ACTIVE_FEATURE_BOUNDS:
            if key in LEGACY_FIELD_ALIASES:
                canonical = LEGACY_FIELD_ALIASES[key]
                errors.append({
                    "loc": ["mix", key],
                    "field": key,
                    "msg": f"Legacy field name '{key}' is not accepted; use canonical field '{canonical}'.",
                    "type": "extra_forbidden",
                })
            else:
                errors.append({
                    "loc": ["mix", key],
                    "field": key,
                    "msg": f"Unknown field '{key}' is not permitted in mix input.",
                    "type": "extra_forbidden",
                })

    # 2. Check all 8 required canonical fields
    for field_name in CANONICAL_FEATURE_ORDER:
        spec = ACTIVE_FEATURE_BOUNDS[field_name]
        label = spec["label"]
        unit = spec["unit"]
        min_val = spec["min"]
        max_val = spec["max"]

        if field_name not in raw_mix or raw_mix[field_name] is None:
            errors.append({
                "loc": ["mix", field_name],
                "field": field_name,
                "msg": f"{label} ({field_name}) is required. Allowed range: {min_val} to {max_val} {unit}.",
                "type": "missing",
            })
            continue

        raw_val = raw_mix[field_name]
        try:
            if spec["type"] == "integer":
                val = parse_strict_integer_age(raw_val, field_name, label)
            else:
                val = parse_strict_finite_float(raw_val, field_name, label)
        except ValueError as exc:
            errors.append({
                "loc": ["mix", field_name],
                "field": field_name,
                "msg": str(exc),
                "type": "value_error",
            })
            continue

        if val < 0:
            errors.append({
                "loc": ["mix", field_name],
                "field": field_name,
                "msg": f"{label} ({field_name}) cannot be negative (received {val}). Allowed training range: {min_val} to {max_val} {unit}.",
                "type": "less_than_equal",
            })
            continue

        if val < min_val or val > max_val:
            errors.append({
                "loc": ["mix", field_name],
                "field": field_name,
                "msg": (
                    f"{label} ({field_name}) = {val} {unit} is outside the model training range "
                    f"[{min_val}, {max_val}] {unit}. Inputs are not silently clamped."
                ),
                "type": "out_of_bounds",
            })
            continue

        cleaned[field_name] = val

    # 3. Cross-field ratio validation if constituent fields are valid
    if all(k in cleaned for k in ("water", "cement", "blast_furnace_slag", "fly_ash")):
        water = float(cleaned["water"])
        cement = float(cleaned["cement"])
        slag = float(cleaned["blast_furnace_slag"])
        ash = float(cleaned["fly_ash"])
        try:
            wc = compute_water_cement_ratio(water, cement)
            wb = compute_water_binder_ratio(water, cement, slag, ash)
            if not (0.20 <= wb <= 1.00):
                errors.append({
                    "loc": ["mix", "water"],
                    "field": "water",
                    "msg": (
                        f"Water/binder ratio (w/b = {wb:.3f}) is outside the plausible "
                        f"range [0.20, 1.00] (w/c = {wc:.3f}). Adjust water or binder quantities."
                    ),
                    "type": "ratio_error",
                })
        except ValueError as exc:
            errors.append({
                "loc": ["mix", "cement"],
                "field": "cement",
                "msg": str(exc),
                "type": "ratio_error",
            })

    return cleaned, errors


def check_split_comparison_notes(mix: Dict[str, Any]) -> List[str]:
    """Compare the reference envelope with the active model development partition."""
    notes: List[str] = []
    for field_name, spec in load_versioned_input_schema()["features"].items():
        if field_name not in mix:
            continue
        val = float(mix[field_name])
        train_bounds = spec.get("train_split_bounds", {})
        t_min = train_bounds.get("min", spec["min"])
        t_max = train_bounds.get("max", spec["max"])
        if val < t_min or val > t_max:
            notes.append(
                f"{spec['label']} ({field_name}={val} {spec['unit']}) is within the 1,030-row UCI reference "
                f"range [{spec['min']}, {spec['max']}], and outside the active model development range [{t_min}, {t_max}]."
            )
    return notes

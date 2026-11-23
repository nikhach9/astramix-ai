"""
One-time local migration tool to export the trusted XGBoost model artifact
to portable native JSON format and generate reference test fixtures from Python
for mathematical parity verification in PHP.
"""
import json
import shutil
import sys
from pathlib import Path

# Add backend/src and backend to sys.path
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend" / "src"))
sys.path.insert(0, str(REPO_ROOT / "backend"))

import joblib
import numpy as np
import pandas as pd

from app.schemas.common import MixComposition
from app.schemas.optimize import OptimizationConstraints as SchemaOptConstraints, OptimizeMixRequest
from app.services.carbon_service import estimate_carbon as service_estimate_carbon
from app.services.cost_service import estimate_cost as service_estimate_cost
from app.services.mix_lab_service import evaluate_mix_lab
from app.services.optimize_service import optimize_mix
from astramix.models.strength.predict import predict_strength
from astramix.sustainability.impact import estimate_co2, estimate_cost


def main() -> None:
    print("--- 1. Exporting native XGBoost model to JSON ---")
    model_src = REPO_ROOT / "artifacts" / "models" / "strength" / "baseline" / "xgboost.joblib"
    dest_dir = REPO_ROOT / "astramix_php" / "data" / "models"
    dest_dir.mkdir(parents=True, exist_ok=True)

    loaded = joblib.load(model_src)
    booster = loaded.get_booster()
    model_json_path = dest_dir / "xgboost_model.json"
    booster.save_model(str(model_json_path))
    print(f"Exported booster to {model_json_path} ({model_json_path.stat().st_size} bytes)")

    # Copy metadata, schema, envelope
    for fn in ("model_metadata.json", "input_schema_v1.json", "training_envelope_v0_1.json"):
        src = REPO_ROOT / "artifacts" / "models" / "strength" / "baseline" / fn
        dst = dest_dir / fn
        if src.exists():
            shutil.copy2(src, dst)
            print(f"Copied {fn} -> {dst}")

    # Copy market SQLite database
    print("\n--- 2. Copying market SQLite database ---")
    db_src = REPO_ROOT / "data" / "market" / "astramix_market.db"
    db_dst_dir = REPO_ROOT / "astramix_php" / "data" / "market"
    db_dst_dir.mkdir(parents=True, exist_ok=True)
    db_dst = db_dst_dir / "astramix_market.db"
    if db_src.exists():
        shutil.copy2(db_src, db_dst)
        print(f"Copied market DB -> {db_dst} ({db_dst.stat().st_size} bytes)")
    else:
        print(f"WARNING: Market DB not found at {db_src}")

    # Generate reference fixtures
    print("\n--- 3. Generating reference test fixtures from Python ---")
    fixtures_file = REPO_ROOT / "astramix_php" / "tests" / "fixtures" / "reference_predictions.json"
    fixtures_file.parent.mkdir(parents=True, exist_ok=True)

    test_mixes = [
        # Standard mixes
        {
            "id": "standard_c25_30",
            "mix": {
                "cement": 350.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 175.0,
                "superplasticizer": 2.5,
                "coarse_aggregate": 1040.0,
                "fine_aggregate": 760.0,
                "age": 28,
            },
        },
        {
            "id": "standard_with_slag_flyash",
            "mix": {
                "cement": 250.0,
                "blast_furnace_slag": 100.0,
                "fly_ash": 50.0,
                "water": 165.0,
                "superplasticizer": 4.0,
                "coarse_aggregate": 1000.0,
                "fine_aggregate": 750.0,
                "age": 28,
            },
        },
        {
            "id": "high_strength_early",
            "mix": {
                "cement": 500.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 140.0,
                "superplasticizer": 12.0,
                "coarse_aggregate": 1000.0,
                "fine_aggregate": 700.0,
                "age": 3,
            },
        },
        {
            "id": "high_strength_28d",
            "mix": {
                "cement": 540.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 162.0,
                "superplasticizer": 2.5,
                "coarse_aggregate": 1040.0,
                "fine_aggregate": 676.0,
                "age": 28,
            },
        },
        {
            "id": "low_strength_lean",
            "mix": {
                "cement": 150.0,
                "blast_furnace_slag": 150.0,
                "fly_ash": 100.0,
                "water": 200.0,
                "superplasticizer": 0.0,
                "coarse_aggregate": 900.0,
                "fine_aggregate": 800.0,
                "age": 7,
            },
        },
        # Boundary mixes: min water
        {
            "id": "boundary_min_water",
            "mix": {
                "cement": 400.0,
                "blast_furnace_slag": 50.0,
                "fly_ash": 25.0,
                "water": 121.75,
                "superplasticizer": 8.0,
                "coarse_aggregate": 1050.0,
                "fine_aggregate": 720.0,
                "age": 28,
            },
        },
        # Boundary mixes: max water
        {
            "id": "boundary_max_water",
            "mix": {
                "cement": 250.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 247.0,
                "superplasticizer": 0.0,
                "coarse_aggregate": 950.0,
                "fine_aggregate": 850.0,
                "age": 28,
            },
        },
        # Extreme ages
        {
            "id": "age_1_day",
            "mix": {
                "cement": 380.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 175.0,
                "superplasticizer": 2.5,
                "coarse_aggregate": 1040.0,
                "fine_aggregate": 760.0,
                "age": 1,
            },
        },
        {
            "id": "age_90_days",
            "mix": {
                "cement": 300.0,
                "blast_furnace_slag": 80.0,
                "fly_ash": 40.0,
                "water": 160.0,
                "superplasticizer": 3.0,
                "coarse_aggregate": 1000.0,
                "fine_aggregate": 750.0,
                "age": 90,
            },
        },
        {
            "id": "age_365_days",
            "mix": {
                "cement": 300.0,
                "blast_furnace_slag": 80.0,
                "fly_ash": 40.0,
                "water": 160.0,
                "superplasticizer": 3.0,
                "coarse_aggregate": 1000.0,
                "fine_aggregate": 750.0,
                "age": 365,
            },
        },
        # Zero additives
        {
            "id": "pure_opc_plain",
            "mix": {
                "cement": 320.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 0.0,
                "water": 190.0,
                "superplasticizer": 0.0,
                "coarse_aggregate": 1050.0,
                "fine_aggregate": 780.0,
                "age": 28,
            },
        },
        # High blast furnace slag
        {
            "id": "high_ggbs",
            "mix": {
                "cement": 180.0,
                "blast_furnace_slag": 350.0,
                "fly_ash": 0.0,
                "water": 160.0,
                "superplasticizer": 5.0,
                "coarse_aggregate": 980.0,
                "fine_aggregate": 720.0,
                "age": 56,
            },
        },
        # High fly ash
        {
            "id": "high_fly_ash",
            "mix": {
                "cement": 220.0,
                "blast_furnace_slag": 0.0,
                "fly_ash": 195.0,
                "water": 155.0,
                "superplasticizer": 6.0,
                "coarse_aggregate": 1020.0,
                "fine_aggregate": 730.0,
                "age": 28,
            },
        },
    ]

    fixture_results = []
    for item in test_mixes:
        mix = item["mix"]
        res = predict_strength(mix)
        cost_res = estimate_cost(
            {k: mix[k] for k in ["cement", "blast_furnace_slag", "fly_ash", "water", "superplasticizer", "coarse_aggregate", "fine_aggregate"]}
        )
        co2_res = estimate_co2(
            {k: mix[k] for k in ["cement", "blast_furnace_slag", "fly_ash", "water", "superplasticizer", "coarse_aggregate", "fine_aggregate"]}
        )
        # Mix lab evaluate
        comp = MixComposition(**mix)
        eval_res = evaluate_mix_lab(mix=comp, target_strength_mpa=30.0)

        fixture_results.append({
            "id": item["id"],
            "input": mix,
            "prediction": {
                "predicted_strength_mpa": float(res["predicted_strength_mpa"]),
                "water_cement_ratio": float(res["water_cement_ratio"]),
                "water_binder_ratio": float(res["water_binder_ratio"]),
                "estimated_error_rmse_mpa": float(res.get("estimated_error_rmse_mpa", 4.62)),
                "estimated_error_mae_mpa": float(res.get("estimated_error_mae_mpa", 3.03)),
                "trust_warnings": res.get("trust_warnings", []),
                "trust_errors": res.get("trust_errors", []),
            },
            "cost": {
                "total": float(cost_res.total),
                "breakdown": {k: float(v) for k, v in cost_res.breakdown.items()},
            },
            "co2": {
                "total": float(co2_res.total),
                "breakdown": {k: float(v) for k, v in co2_res.breakdown.items()},
            },
            "mix_lab_cards": {
                "strength": {
                    "status": eval_res["cards"]["predicted_strength"]["status"],
                    "color": eval_res["cards"]["predicted_strength"]["color"],
                    "badge": eval_res["cards"]["predicted_strength"]["badge"],
                },
                "cost": {
                    "status": eval_res["cards"]["estimated_ingredient_cost"]["status"],
                    "color": eval_res["cards"]["estimated_ingredient_cost"]["color"],
                    "badge": eval_res["cards"]["estimated_ingredient_cost"]["badge"],
                    "total_per_m3": eval_res["cards"]["estimated_ingredient_cost"]["known_subtotal_per_m3"],
                },
                "emissions": {
                    "status": eval_res["cards"]["estimated_embodied_emissions"]["status"],
                    "color": eval_res["cards"]["estimated_embodied_emissions"]["color"],
                    "badge": eval_res["cards"]["estimated_embodied_emissions"]["badge"],
                    "total_kg_co2e_per_m3": eval_res["cards"]["estimated_embodied_emissions"]["known_subtotal_co2_kg_per_m3"],
                },
            },
        })

    # Test optimization runs
    opt_fixtures = []
    opt_cases = [
        {"target_strength_mpa": 30.0, "age": 28, "max_w_c_ratio": 0.60, "alpha": 1.0, "beta": 1.0},
        {"target_strength_mpa": 45.0, "age": 28, "max_w_c_ratio": 0.50, "alpha": 1.0, "beta": 1.0},
        {"target_strength_mpa": 85.0, "age": 28, "max_w_c_ratio": 0.40, "alpha": 1.0, "beta": 1.0}, # Infeasible target
    ]

    for case in opt_cases:
        constraints = SchemaOptConstraints(
            target_strength_mpa=case["target_strength_mpa"],
            age=case["age"],
            max_w_c_ratio=case["max_w_c_ratio"],
            alpha=case["alpha"],
            beta=case["beta"],
        )
        req = OptimizeMixRequest(constraints=constraints)
        opt_res = optimize_mix(req)
        opt_fixtures.append({
            "input": case,
            "success": opt_res.success,
            "is_optimum": opt_res.is_optimum,
            "solver_status": opt_res.solver_status,
            "mix": opt_res.mix.model_dump(),
            "predicted_strength_mpa": float(opt_res.predicted_strength_mpa),
            "water_cement_ratio": float(opt_res.water_cement_ratio),
            "water_binder_ratio": float(opt_res.water_binder_ratio),
            "co2_kg_per_m3": float(opt_res.co2_kg_per_m3),
            "cost_per_m3": float(opt_res.cost_per_m3),
            "objective_value": float(opt_res.objective_value),
        })

    fixtures_data = {
        "description": "AstraMix AI Reference Predictions & Evaluations from trusted Python backend",
        "generated_at": "2026-10-18T18:15:00Z",
        "mixes": fixture_results,
        "optimizations": opt_fixtures,
    }

    fixtures_file.write_text(json.dumps(fixtures_data, indent=2), encoding="utf-8")
    print(f"Generated {len(fixture_results)} mix fixtures and {len(opt_fixtures)} optimization fixtures at {fixtures_file}")
    print("\nModel export & reference generation complete!")


if __name__ == "__main__":
    main()

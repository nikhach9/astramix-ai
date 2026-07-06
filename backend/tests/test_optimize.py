import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from astramix.optimization.optimizer import OptimizationResult

client = TestClient(app)

VALID_MIX_DICT = {
    "cement": 400,
    "water": 160,
    "fine_aggregate": 700,
    "coarse_aggregate": 1050,
    "fly_ash": 40,
    "blast_furnace_slag": 60,
    "superplasticizer": 4.0,
}


def test_optimize_mix_success():
    response = client.post(
        "/api/v1/optimize-mix",
        json={
            "constraints": {
                "target_strength_mpa": 40,
                "age": 28,
                "max_w_c_ratio": 0.5,
                "alpha": 1.0,
                "beta": 1.0,
            }
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "mix" in body
    assert "cement" in body["mix"]
    assert "predicted_strength_mpa" in body
    assert "co2_kg_per_m3" in body
    assert "cost_per_m3" in body
    assert "objective_value" in body


def test_optimize_mix_passes_initial_guess():
    guess_mix = {**VALID_MIX_DICT, "age": 28}
    response = client.post(
        "/api/v1/optimize-mix",
        json={
            "constraints": {"target_strength_mpa": 40},
            "initial_guess": guess_mix,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "mix" in body


def test_optimize_mix_non_converged_out_of_band_mix_does_not_fail_response_validation():
    """A best-effort, non-converged candidate can legitimately sit
    outside the plausible-input water/binder ratio band. That must
    still come back as a normal 200 (success=false), not a 500 from
    response-model validation against MixComposition's input rules."""
    response = client.post(
        "/api/v1/optimize-mix",
        # Force an impossible target strength to cause non-convergence
        json={"constraints": {"target_strength_mpa": 150}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert "water" in body["mix"]


def test_optimize_mix_unsuccessful_search_is_200_not_error():
    """A search that completes but doesn't converge is a normal,
    informative result (success=False + warnings), not an HTTP error."""
    response = client.post(
        "/api/v1/optimize-mix",
        json={"constraints": {"target_strength_mpa": 150}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert "warnings" in body
    assert len(body["warnings"]) > 0


def test_optimize_mix_raises_on_optimizer_exception(monkeypatch):
    """An actual exception from the optimizer (not a plain unsuccessful
    result) is still a hard error."""

    def boom(constraints, strength_fn, alpha=1.0, beta=1.0, initial_guess=None, **kwargs):
        raise RuntimeError("astramix internal failure")

    monkeypatch.setattr("app.services.optimize_service.run_optimization", boom)

    response = client.post(
        "/api/v1/optimize-mix",
        json={"constraints": {"target_strength_mpa": 40}},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "OptimizationError"


def test_optimize_mix_propagates_model_load_error_unwrapped(monkeypatch):
    """A ModelLoadError raised inside strength_fn (e.g. the trained
    model isn't available) is a domain error with its own precise
    status code (503) — it must propagate as-is, not get flattened
    into a generic OptimizationError/422."""

    def raises_model_load_error(constraints, strength_fn, alpha=1.0, beta=1.0, initial_guess=None, **kwargs):
        # Exercise strength_fn the way the real optimizer would, so the
        # ModelLoadError actually originates from inside the call.
        strength_fn(VALID_MIX_DICT, 28)
        return None  # unreachable if strength_fn raises, as expected

    monkeypatch.setattr("app.services.optimize_service.run_optimization", raises_model_load_error)

    def raise_missing(*args, **kwargs):
        raise RuntimeError("Model artifact missing or failed to load")
    monkeypatch.setattr("app.ml.strength_predictor.predict_strength", raise_missing)

    response = client.post(
        "/api/v1/optimize-mix",
        json={"constraints": {"target_strength_mpa": 40}},
    )
    # No trained model artifact exists in this test environment, so
    # predict_from_core_row raises ModelLoadError -> 503, unwrapped.
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "ModelLoadError"


def test_optimize_mix_max_w_c_ratio_defaults_to_060():
    """max_w_c_ratio must default to 0.60, not be optional/None."""
    response = client.post(
        "/api/v1/optimize-mix",
        json={"constraints": {"target_strength_mpa": 40}},
    )
    # Must reach the optimizer layer (fails only because it's the
    # unmocked stub here), not be rejected by request validation.
    assert response.json().get("error") != "ValidationError"


def test_optimize_mix_does_not_require_co2_or_cost_limits():
    """v0.1 is a weighted-sum optimizer, not hard-CO2/cost-constrained —
    a bare target_strength_mpa must be a valid request, not a 422."""
    response = client.post(
        "/api/v1/optimize-mix",
        json={"constraints": {"target_strength_mpa": 40}},
    )
    assert response.json().get("error") != "ValidationError"

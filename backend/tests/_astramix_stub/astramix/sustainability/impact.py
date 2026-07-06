"""Stub only — real implementation lives in the astramix core package."""
from dataclasses import dataclass


@dataclass
class EstimationResult:
    total: float
    breakdown: dict[str, float]
    unit: str = ""


def estimate_co2(material_quantities: dict, unit_costs=None) -> EstimationResult:
    raise RuntimeError("Stub — tests must monkeypatch this function.")


def estimate_cost(material_quantities: dict, unit_costs=None) -> EstimationResult:
    raise RuntimeError("Stub — tests must monkeypatch this function.")

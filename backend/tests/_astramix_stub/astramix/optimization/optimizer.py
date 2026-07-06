"""Stub only — real implementation lives in the astramix core package."""
from dataclasses import dataclass, field
from typing import Callable

# Canonical order of the optimizer's internal vector representation.
DESIGN_VARIABLES = (
    "cement",
    "water",
    "fly_ash",
    "blast_furnace_slag",
    "coarse_aggregate",
    "fine_aggregate",
    "superplasticizer",
)


@dataclass
class OptimizationConstraints:
    target_strength: float
    age_days: int = 28
    max_w_c_ratio: float = 0.60


@dataclass
class OptimizationResult:
    mix: dict[str, float]
    predicted_strength: float
    co2: float
    cost: float
    objective_value: float
    success: bool
    warnings: list[str] = field(default_factory=list)


def run_optimization(
    constraints: OptimizationConstraints,
    strength_fn: Callable[[dict, int], float],
    alpha: float = 1.0,
    beta: float = 1.0,
    initial_guess=None,  # np.ndarray | None, in DESIGN_VARIABLES order
    **kwargs,
) -> OptimizationResult:
    raise RuntimeError("Stub — tests must monkeypatch this function.")

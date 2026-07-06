import math
from dataclasses import dataclass
from typing import Dict, Optional

@dataclass
class EstimationResult:
    total: float
    breakdown: Dict[str, float]
    unit: str


CANONICAL_MATERIALS = {
    "cement",
    "fly_ash",
    "blast_furnace_slag",
    "water",
    "coarse_aggregate",
    "fine_aggregate",
    "superplasticizer",
}

DEFAULT_CO2_FACTORS = {
    "cement": 0.90,
    "fly_ash": 0.01,
    "blast_furnace_slag": 0.07,
    "water": 0.0003,
    "coarse_aggregate": 0.005,
    "fine_aggregate": 0.005,
    "superplasticizer": 0.70,
}

DEFAULT_COST_FACTORS = {
    "cement": 0.12,
    "fly_ash": 0.04,
    "blast_furnace_slag": 0.06,
    "water": 0.002,
    "coarse_aggregate": 0.015,
    "fine_aggregate": 0.020,
    "superplasticizer": 2.50,
}

def _validate_quantities(quantities: Dict[str, float]) -> None:
    if not isinstance(quantities, dict):
        raise TypeError("Quantities must be a dictionary.")
    if not quantities:
        raise ValueError("Quantities dictionary cannot be empty.")
    
    for key, value in quantities.items():
        if key not in CANONICAL_MATERIALS:
            raise ValueError(f"Unknown material '{key}'. Must be one of {CANONICAL_MATERIALS}.")
        if isinstance(value, bool):
            raise TypeError(f"Value for '{key}' cannot be a boolean.")
        if not isinstance(value, (int, float)):
            raise TypeError(f"Value for '{key}' must be a number.")
        if math.isnan(value) or math.isinf(value):
            raise ValueError(f"Value for '{key}' cannot be NaN or inf.")
        if value < 0:
            raise ValueError(f"Value for '{key}' cannot be negative.")

def _validate_factors(factors: Dict[str, float]) -> None:
    if not isinstance(factors, dict):
        raise TypeError("Factors must be a dictionary.")
    
    for key, value in factors.items():
        if key not in CANONICAL_MATERIALS:
            raise ValueError(f"Unknown material '{key}' in factors.")
        if isinstance(value, bool):
            raise TypeError(f"Factor for '{key}' cannot be a boolean.")
        if not isinstance(value, (int, float)):
            raise TypeError(f"Factor for '{key}' must be a number.")
        if math.isnan(value) or math.isinf(value):
            raise ValueError(f"Factor for '{key}' cannot be NaN or inf.")
        if value < 0:
            raise ValueError(f"Factor for '{key}' cannot be negative.")

def estimate_co2(material_quantities: Dict[str, float], custom_factors: Optional[Dict[str, float]] = None) -> EstimationResult:
    _validate_quantities(material_quantities)
    
    factors = dict(DEFAULT_CO2_FACTORS)
    if custom_factors is not None:
        _validate_factors(custom_factors)
        factors.update(custom_factors)
        
    breakdown = {}
    total = 0.0
    for material, qty in material_quantities.items():
        factor = factors.get(material, 0.0)
        co2 = float(qty) * float(factor)
        breakdown[material] = co2
        total += co2
        
    return EstimationResult(
        total=total,
        breakdown=breakdown,
        unit="kg_co2e_per_m3"
    )

def estimate_cost(material_quantities: Dict[str, float], custom_costs: Optional[Dict[str, float]] = None) -> EstimationResult:
    _validate_quantities(material_quantities)
    
    costs = dict(DEFAULT_COST_FACTORS)
    if custom_costs is not None:
        _validate_factors(custom_costs)
        costs.update(custom_costs)
        
    breakdown = {}
    total = 0.0
    for material, qty in material_quantities.items():
        cost_factor = costs.get(material, 0.0)
        c = float(qty) * float(cost_factor)
        breakdown[material] = c
        total += c
        
    return EstimationResult(
        total=total,
        breakdown=breakdown,
        unit="currency_per_m3"
    )

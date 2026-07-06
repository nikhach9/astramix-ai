"""
Orchestration layer for CO2 estimation.

Delegates the actual calculation to the real AstraMix package
(`astramix.sustainability.impact.estimate_co2`) — this module only
adapts between our API schemas and that package's contract, and
translates failures into a clean HTTP error. No CO2 logic lives here.

CONTRACT:
    estimate_co2(material_quantities: dict[str, float]) -> EstimationResult
        `material_quantities` must contain ONLY the canonical material
        fields (cement, fly_ash, blast_furnace_slag, water,
        coarse_aggregate, fine_aggregate, superplasticizer) — no `age`,
        since age is not a material property. See app.adapters.

        The returned `EstimationResult` exposes:
            .total       total CO2 (kg CO2e / m3)
            .breakdown   dict[str, float] per-material contribution
            .unit        unit string (e.g. "kg_co2e_per_m3")
"""
from astramix.sustainability.impact import estimate_co2 as astramix_estimate_co2

from app.adapters import mix_to_material_quantities
from app.core.exceptions import AstraMixError
from app.schemas.carbon import CarbonEstimationResponse
from app.schemas.common import MixComposition


def estimate_carbon(mix: MixComposition) -> CarbonEstimationResponse:
    material_quantities = mix_to_material_quantities(mix)

    try:
        result = astramix_estimate_co2(material_quantities)
    except Exception as exc:  # noqa: BLE001
        raise AstraMixError(
            "Failed to estimate CO2 for the given mix.",
            details={"reason": str(exc)},
        ) from exc

    return CarbonEstimationResponse(
        total_co2_kg_per_m3=round(result.total, 3),
        breakdown_kg_per_m3={k: round(v, 3) for k, v in result.breakdown.items()},
    )

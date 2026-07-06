"""
Orchestration layer for cost estimation.

Delegates the actual calculation to the real AstraMix package
(`astramix.sustainability.impact.estimate_cost`) — this module only
adapts between our API schemas and that package's contract.

CONTRACT:
    estimate_cost(
        material_quantities: dict[str, float],
        unit_costs: dict[str, float] | None = None,
    ) -> EstimationResult
        `material_quantities` must contain ONLY the canonical material
        fields — no `age`. See app.adapters.

        The returned `EstimationResult` exposes:
            .total       total cost per m3
            .breakdown   dict[str, float] per-material contribution
            .unit        unit string (e.g. "currency_per_m3")
"""
from astramix.sustainability.impact import estimate_cost as astramix_estimate_cost

from app.adapters import mix_to_material_quantities
from app.core.exceptions import AstraMixError
from app.schemas.common import MixComposition
from app.schemas.cost import CostEstimationRequest, CostEstimationResponse


def estimate_cost(request: CostEstimationRequest) -> CostEstimationResponse:
    mix: MixComposition = request.mix
    material_quantities = mix_to_material_quantities(mix)
    overrides = request.unit_costs.model_dump(exclude_none=True) if request.unit_costs else None

    try:
        result = astramix_estimate_cost(material_quantities, overrides)
    except Exception as exc:  # noqa: BLE001
        raise AstraMixError(
            "Failed to estimate cost for the given mix.",
            details={"reason": str(exc)},
        ) from exc

    return CostEstimationResponse(
        total_cost_per_m3=round(result.total, 2),
        currency=request.currency.upper(),
        breakdown_per_m3={k: round(v, 2) for k, v in result.breakdown.items()},
    )

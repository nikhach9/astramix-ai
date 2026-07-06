"""
Adapters between our API-level `MixComposition` schema and the plain
dict/DataFrame shapes the real `astramix` package expects.

The `astramix` core package works with two different shapes:

1. **Material quantities only** (`astramix.sustainability.impact`) — CO2
   and cost are physical properties of the materials in the mix, not of
   how long it cures, so `age` must never be passed to these functions.
2. **Core feature rows** (`astramix.features.engineering`) — strength
   prediction *does* depend on curing age, so the feature row includes
   `age` alongside the material quantities.

Keeping this mapping in one place means a future rename in either the
API schema or the astramix package only needs to change here.
"""
from app.schemas.common import MixComposition

# Canonical material-quantity fields, in the order astramix expects them.
MATERIAL_FIELDS = (
    "cement",
    "fly_ash",
    "blast_furnace_slag",
    "water",
    "coarse_aggregate",
    "fine_aggregate",
    "superplasticizer",
)


def mix_to_material_quantities(mix: MixComposition) -> dict[str, float]:
    """Material-only view of a mix, for the sustainability module.

    Deliberately excludes `age` — it is not a material and the real
    CO2/cost estimators do not accept it.
    """
    return {field: getattr(mix, field) for field in MATERIAL_FIELDS}


def mix_to_core_feature_row(mix: MixComposition) -> dict[str, float]:
    """Full feature row for the strength model, including `age`."""
    row = mix_to_material_quantities(mix)
    row["age"] = mix.age
    return row

STRENGTH_FEATURE_COLUMNS = [
    "cement",
    "blast_furnace_slag",
    "fly_ash",
    "water",
    "superplasticizer",
    "coarse_aggregate",
    "fine_aggregate",
    "age",
]

STRENGTH_TARGET_COLUMN = "compressive_strength_mpa"

STRENGTH_REQUIRED_COLUMNS = STRENGTH_FEATURE_COLUMNS + [STRENGTH_TARGET_COLUMN]

MATERIAL_COLUMNS = [
    "cement",
    "blast_furnace_slag",
    "fly_ash",
    "water",
    "superplasticizer",
    "coarse_aggregate",
    "fine_aggregate",
]

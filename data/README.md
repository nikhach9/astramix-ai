# AstraMix Data Package v0.1

This folder contains the official dataset configurations and external parameter mappings for the AstraMix v0.1 model.

## Dataset Source
The primary ML dataset used for strength prediction is the [Concrete Compressive Strength Dataset](https://archive.ics.uci.edu/ml/datasets/concrete+compressive+strength) from the UCI Machine Learning Repository.

## Target Variable
The target variable for the machine learning models is `compressive_strength_mpa`, which predicts the compressive strength of the concrete mix at a given age.

## Schema and Units
The processed dataset (`data/processed/strength_dataset_v0_1.csv`) strictly adheres to the following v0.1 canonical schema. All material quantities are expressed in kilograms per cubic meter (kg/m³).

| Column Name                 | Description                                  | Unit     |
| --------------------------- | -------------------------------------------- | -------- |
| `cement`                    | Amount of Portland cement                    | kg/m³    |
| `blast_furnace_slag`        | Amount of blast furnace slag (binder)        | kg/m³    |
| `fly_ash`                   | Amount of fly ash (binder)                   | kg/m³    |
| `water`                     | Amount of water                              | kg/m³    |
| `superplasticizer`          | Amount of superplasticizer (water reducer)   | kg/m³    |
| `coarse_aggregate`          | Amount of coarse aggregate                   | kg/m³    |
| `fine_aggregate`            | Amount of fine aggregate                     | kg/m³    |
| `age`                       | Curing age of the concrete                   | days     |
| `compressive_strength_mpa`  | Measured compressive strength                | MPa      |

*(Note: The term "slag" has been normalized to `blast_furnace_slag` across the v0.1 contracts).*

## External Constants
The `data/external/` folder contains CSV mappings for material costs and environmental impacts.

- **Emission Factors** (`material_emission_factors_v0_1.csv`): Carbon dioxide equivalent emissions per kg of material.
- **Material Prices** (`material_prices_v0_1.csv`): Estimated cost per kg of material.

**Important Note:** The emission factors and material prices included in this v0.1 release are **placeholders** (`placeholder_market_value`, `placeholder_literature_value`) for demonstration and model testing. They should be updated with exact local or localized data before production usage.

## Future Work
Datasets related to concrete workability (e.g., Slump) and environmental resilience (Durability) are considered future work and are excluded from the v0.1 baseline model structure.

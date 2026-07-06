import pandas as pd
import numpy as np
from .schema import STRENGTH_REQUIRED_COLUMNS, MATERIAL_COLUMNS

def validate_strength_dataframe(df: pd.DataFrame, allow_extra: bool = False) -> pd.DataFrame:
    """
    Validates a strength dataset dataframe against the canonical v0.1 schema.
    """
    # Check for required columns
    missing_cols = [col for col in STRENGTH_REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # Check for extra columns
    if not allow_extra:
        extra_cols = [col for col in df.columns if col not in STRENGTH_REQUIRED_COLUMNS]
        if extra_cols:
            raise ValueError(f"Extra unknown columns found: {extra_cols}. Set allow_extra=True to ignore.")

    # Restrict to canonical columns and order
    df_clean = df[STRENGTH_REQUIRED_COLUMNS].copy()

    # Check that all columns are numeric
    for col in STRENGTH_REQUIRED_COLUMNS:
        if not pd.api.types.is_numeric_dtype(df_clean[col]):
            raise ValueError(f"Column '{col}' must be numeric, but got type {df_clean[col].dtype}.")

    # Check for NaN values
    if df_clean.isna().any().any():
        raise ValueError("DataFrame contains NaN values. All values must be valid numbers.")

    # Check for inf values
    if np.isinf(df_clean.to_numpy()).any():
        raise ValueError("DataFrame contains infinite values (inf).")

    # Reject age <= 0
    if (df_clean["age"] <= 0).any():
        raise ValueError("Concrete 'age' must be strictly positive (> 0).")

    # Reject compressive_strength_mpa <= 0
    if (df_clean["compressive_strength_mpa"] <= 0).any():
        raise ValueError("Concrete 'compressive_strength_mpa' must be strictly positive (> 0).")

    # Check for negative values in material columns
    if (df_clean[MATERIAL_COLUMNS] < 0).any().any():
        raise ValueError("DataFrame contains negative values, which are not physically valid.")

    # Duplicate rows are intentionally kept for v0.1 as per requirements.
    # We could log a warning here if a logger was provided, but no failure.
    
    return df_clean

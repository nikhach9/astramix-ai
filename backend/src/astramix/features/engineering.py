"""Compatibility identity transform; the model uses eight raw input features."""
import pandas as pd


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return an independent copy without inventing untrained feature columns."""
    return df.copy()

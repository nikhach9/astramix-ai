"""Stub only — real implementation lives in the astramix core package."""
import pandas as pd


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Placeholder passthrough. Tests monkeypatch this directly when
    they need to control feature-engineering behavior."""
    return df.copy()

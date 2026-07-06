import os
from pathlib import Path
import pandas as pd
from typing import Union
from .validation import validate_strength_dataframe

def load_raw_strength_dataset(path: Union[str, Path]) -> pd.DataFrame:
    """
    Loads the raw UCI concrete compressive strength dataset from CSV.
    """
    path_obj = Path(path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Raw dataset not found at: {path_obj.resolve()}")
        
    try:
        df = pd.read_csv(path_obj)
    except Exception as e:
        raise RuntimeError(f"Failed to read raw CSV at {path_obj}: {e}") from e
        
    return df

def load_processed_strength_dataset(path: Union[str, Path]) -> pd.DataFrame:
    """
    Loads and validates the processed v0.1 strength dataset.
    """
    return load_strength_dataset(path, validate=True)

def load_strength_dataset(path: Union[str, Path], validate: bool = True) -> pd.DataFrame:
    """
    Loads a strength dataset. Validates it against the canonical schema if requested.
    """
    path_obj = Path(path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Processed dataset not found at: {path_obj.resolve()}")
        
    try:
        df = pd.read_csv(path_obj)
    except Exception as e:
        raise RuntimeError(f"Failed to read CSV at {path_obj}: {e}") from e
        
    if validate:
        try:
            df = validate_strength_dataframe(df, allow_extra=False)
        except ValueError as e:
            raise ValueError(f"Schema validation failed for {path_obj.name}: {e}") from e
            
    return df

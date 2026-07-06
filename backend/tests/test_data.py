import pytest
import pandas as pd
import numpy as np
from astramix.data.validation import validate_strength_dataframe
from astramix.data.schema import STRENGTH_REQUIRED_COLUMNS

@pytest.fixture
def valid_df():
    """Creates a valid v0.1 strength dataframe."""
    return pd.DataFrame({
        "cement": [300.0, 400.0],
        "blast_furnace_slag": [0.0, 100.0],
        "fly_ash": [50.0, 0.0],
        "water": [180.0, 160.0],
        "superplasticizer": [5.0, 10.0],
        "coarse_aggregate": [1000.0, 950.0],
        "fine_aggregate": [700.0, 800.0],
        "age": [28, 56],
        "compressive_strength_mpa": [40.5, 60.2]
    })

def test_valid_processed_dataset_passes(valid_df):
    """Test that a valid dataset passes validation unmodified."""
    validated = validate_strength_dataframe(valid_df)
    assert list(validated.columns) == STRENGTH_REQUIRED_COLUMNS
    assert len(validated) == 2

def test_missing_column_fails(valid_df):
    """Test that removing a required column raises a ValueError."""
    df_missing = valid_df.drop(columns=["cement"])
    with pytest.raises(ValueError, match="Missing required columns"):
        validate_strength_dataframe(df_missing)

def test_extra_column_fails(valid_df):
    """Test that an extra column raises a ValueError by default."""
    df_extra = valid_df.copy()
    df_extra["extra_col"] = 1.0
    with pytest.raises(ValueError, match="Extra unknown columns found"):
        validate_strength_dataframe(df_extra)

def test_extra_column_passes_if_allowed(valid_df):
    """Test that an extra column is ignored and dropped if allow_extra=True."""
    df_extra = valid_df.copy()
    df_extra["extra_col"] = 1.0
    validated = validate_strength_dataframe(df_extra, allow_extra=True)
    assert "extra_col" not in validated.columns
    assert list(validated.columns) == STRENGTH_REQUIRED_COLUMNS

def test_nan_fails(valid_df):
    """Test that NaN values raise a ValueError."""
    df_nan = valid_df.copy()
    df_nan.loc[0, "water"] = np.nan
    with pytest.raises(ValueError, match="contains NaN values"):
        validate_strength_dataframe(df_nan)

def test_negative_value_fails(valid_df):
    """Test that negative values raise a ValueError."""
    df_neg = valid_df.copy()
    df_neg.loc[0, "cement"] = -10.0
    with pytest.raises(ValueError, match="contains negative values"):
        validate_strength_dataframe(df_neg)

def test_age_zero_or_less_fails(valid_df):
    """Test that age <= 0 raises a ValueError."""
    df_zero = valid_df.copy()
    df_zero.loc[0, "age"] = 0
    with pytest.raises(ValueError, match="age' must be strictly positive"):
        validate_strength_dataframe(df_zero)
        
    df_neg = valid_df.copy()
    df_neg.loc[0, "age"] = -5
    with pytest.raises(ValueError, match="age' must be strictly positive"):
        validate_strength_dataframe(df_neg)

def test_compressive_strength_zero_or_less_fails(valid_df):
    """Test that compressive_strength_mpa <= 0 raises a ValueError."""
    df_zero = valid_df.copy()
    df_zero.loc[0, "compressive_strength_mpa"] = 0
    with pytest.raises(ValueError, match="compressive_strength_mpa' must be strictly positive"):
        validate_strength_dataframe(df_zero)

def test_raw_old_uci_names_fail(valid_df):
    """Test that the raw UCI column names (e.g. 'slag') fail validation."""
    df_old = valid_df.copy()
    df_old = df_old.rename(columns={"blast_furnace_slag": "slag", "compressive_strength_mpa": "strength"})
    with pytest.raises(ValueError, match="Missing required columns"):
        validate_strength_dataframe(df_old)

def test_duplicate_rows_do_not_fail(valid_df):
    """Test that duplicate rows pass validation in v0.1."""
    # Duplicate the first row
    df_dup = pd.concat([valid_df, valid_df.iloc[[0]]], ignore_index=True)
    validated = validate_strength_dataframe(df_dup)
    assert len(validated) == 3

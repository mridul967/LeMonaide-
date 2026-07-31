"""
Dataset profiling and synthetic demo dataset generation service.
Calculates SHA-256 fingerprints, schemas, missingness, and class balance.
"""

import hashlib
from pathlib import Path
from typing import Any, Dict, Tuple
import numpy as np
import pandas as pd


def compute_file_sha256(file_path: Path) -> str:
    """Computes SHA-256 checksum fingerprint of a target data file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def profile_dataframe(df: pd.DataFrame, target_column: str = "target") -> Dict[str, Any]:
    """Generates statistical profile summary of a DataFrame."""
    total_rows, total_cols = df.shape
    columns_info = []

    for col in df.columns:
        col_type = str(df[col].dtype)
        missing_count = int(df[col].isnull().sum())
        missing_pct = float((missing_count / total_rows) * 100) if total_rows > 0 else 0.0

        info: Dict[str, Any] = {
            "name": col,
            "dtype": col_type,
            "missing_count": missing_count,
            "missing_pct": round(missing_pct, 2),
        }

        if pd.api.types.is_numeric_dtype(df[col]):
            info["numeric_stats"] = {
                "mean": round(float(df[col].mean()), 4) if not df[col].isnull().all() else None,
                "std": round(float(df[col].std()), 4) if not df[col].isnull().all() else None,
                "min": round(float(df[col].min()), 4) if not df[col].isnull().all() else None,
                "max": round(float(df[col].max()), 4) if not df[col].isnull().all() else None,
            }
        elif pd.api.types.is_string_dtype(df[col]) or pd.api.types.is_categorical_dtype(df[col]):
            top_counts = df[col].value_counts().head(5).to_dict()
            info["top_categories"] = {str(k): int(v) for k, v in top_counts.items()}

        columns_info.append(info)

    target_distribution = {}
    if target_column in df.columns:
        counts = df[target_column].value_counts().to_dict()
        target_distribution = {str(k): int(v) for k, v in counts.items()}

    return {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "columns": columns_info,
        "target_column": target_column,
        "target_distribution": target_distribution,
    }


def generate_synthetic_churn_dataset(n_samples: int = 1000, seed: int = 42) -> pd.DataFrame:
    """
    Generates synthetic Customer Churn dataset with an engineered failure slice.
    Engineered slice: SeniorCitizen == 1 & PaymentElectronicCheck == 1 has high churn rate (85%).
    """
    np.random.seed(seed)
    
    tenure = np.random.randint(1, 72, size=n_samples)
    monthly_charges = np.random.uniform(20.0, 120.0, size=n_samples)
    senior_citizen = np.random.choice([0, 1], size=n_samples, p=[0.8, 0.2])
    payment_electronic = np.random.choice([0, 1], size=n_samples, p=[0.6, 0.4])
    contract_type = np.random.choice(["Month-to-month", "One year", "Two year"], size=n_samples, p=[0.5, 0.3, 0.2])

    # Base probability of churn
    logit = -1.5 - (0.04 * tenure) + (0.02 * monthly_charges)
    # Engineered slice anomaly: SeniorCitizen with electronic check has severe failure risk
    slice_mask = (senior_citizen == 1) & (payment_electronic == 1)
    logit[slice_mask] += 2.8

    prob = 1 / (1 + np.exp(-logit))
    churn = (np.random.rand(n_samples) < prob).astype(int)

    df = pd.DataFrame({
        "tenure": tenure,
        "monthly_charges": np.round(monthly_charges, 2),
        "senior_citizen": senior_citizen,
        "payment_electronic": payment_electronic,
        "contract_type": contract_type,
        "target": churn,
    })
    return df

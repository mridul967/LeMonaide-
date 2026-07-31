"""
Baseline machine learning model training, evaluation, and serialization service.
Fits scikit-learn models, evaluates metrics, and computes per-sample predictions for Failure Lab.
"""

from pathlib import Path
from typing import Any, Dict, List, Tuple
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, log_loss
from sklearn.model_selection import train_test_split


def instantiate_model(model_family: str, hyperparameters: Dict[str, Any]) -> Any:
    """
    Instantiates an ML estimator.
    Raises ValueError with explicit reason if model family is unavailable.
    """
    if model_family == "logistic_regression":
        c_val = float(hyperparameters.get("C", 1.0))
        return LogisticRegression(C=c_val, max_iter=1000, random_state=42)
    elif model_family == "random_forest":
        n_est = int(hyperparameters.get("n_estimators", 100))
        depth = hyperparameters.get("max_depth", None)
        return RandomForestClassifier(n_estimators=n_est, max_depth=depth, random_state=42)
    elif model_family == "xgboost":
        try:
            import xgboost as xgb
            return xgb.XGBClassifier(n_estimators=int(hyperparameters.get("n_estimators", 100)), random_state=42)
        except ImportError:
            raise ValueError("Model family 'xgboost' is currently unavailable. Reason: xgboost library is not installed in runtime.")
    elif model_family == "pytorch":
        raise ValueError("Model family 'pytorch' is currently unavailable. Reason: PyTorch deep learning estimator adapter is not enabled in Phase 1 MVP.")
    else:
        raise ValueError(f"Model family '{model_family}' is unrecognized or unsupported by the training engine.")


def train_baseline_model(
    file_path: Path,
    model_family: str,
    hyperparameters: Dict[str, Any],
    target_column: str = "target",
    save_dir: Path = None,
) -> Tuple[Dict[str, float], Dict[str, float], List[Dict[str, Any]]]:
    """Trains a baseline model on the specified CSV/Parquet file."""
    df = pd.read_csv(file_path) if file_path.suffix == ".csv" else pd.read_parquet(file_path)
    
    if target_column not in df.columns:
        target_column = df.columns[-1]

    feature_cols = [c for c in df.columns if c != target_column]
    X = pd.get_dummies(df[feature_cols], drop_first=True)
    y = df[target_column]

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, df.index, test_size=0.2, random_state=42, stratify=y if len(y.unique()) < 10 else None
    )

    model = instantiate_model(model_family, hyperparameters)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred.astype(float)

    acc = float(accuracy_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred, average="weighted"))
    try:
        loss = float(log_loss(y_test, y_prob))
    except Exception:
        loss = 0.0

    metrics = {
        "accuracy": round(acc, 4),
        "f1_weighted": round(f1, 4),
        "log_loss": round(loss, 4),
    }

    feature_importances = {}
    if hasattr(model, "feature_importances_"):
        for col, imp in zip(X.columns, model.feature_importances_):
            feature_importances[col] = round(float(imp), 4)
    elif hasattr(model, "coef_"):
        for col, coef in zip(X.columns, model.coef_[0]):
            feature_importances[col] = round(float(abs(coef)), 4)

    per_sample_predictions = []
    original_test_df = df.loc[idx_test]
    for i, (orig_idx, row) in enumerate(original_test_df.iterrows()):
        true_val = int(y_test.iloc[i])
        pred_val = int(y_pred[i])
        prob_val = float(y_prob[i])
        is_error = bool(true_val != pred_val)

        sample_detail = {
            "sample_index": int(orig_idx),
            "y_true": true_val,
            "y_pred": pred_val,
            "y_prob": round(prob_val, 4),
            "is_error": is_error,
            "error_delta": round(abs(true_val - prob_val), 4),
            "features": row[feature_cols].to_dict(),
        }
        per_sample_predictions.append(sample_detail)

    if save_dir:
        save_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, save_dir / "model.joblib")

    return metrics, feature_importances, per_sample_predictions

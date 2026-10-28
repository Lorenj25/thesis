"""
CodeAuthentic - Classifier Head Training Pipeline.
Trains a frozen-feature classifier head (StandardScaler + LogisticRegression)
on top of 770-dimensional CodeBERT representations.

Expects directory structure:
  <data_dir>/
    human/  (human-written code files)
    ai/     (AI-generated code files)

Splits 70/15/15 stratified train/val/test, prints metrics, and saves:
  ml/heads/<language>.joblib

Usage:
  python -m ml.train_head --language python --data dataset/python
  python -m ml.train_head --language java --data dataset/java
  python -m ml.train_head --language c --data dataset/c
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Tuple
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ml.predictor import extract_features, HEADS_DIR


def load_dataset_from_disk(data_dir: Path, language: str) -> Tuple[List[str], List[int]]:
    """
    Reads code files from human/ (label 0) and ai/ (label 1) subfolders.
    """
    human_dir = data_dir / "human"
    ai_dir = data_dir / "ai"

    if not human_dir.exists() or not ai_dir.exists():
        raise FileNotFoundError(
            f"Expected both 'human/' and 'ai/' subdirectories inside {data_dir.resolve()}.\n"
            f"Found: human={human_dir.exists()}, ai={ai_dir.exists()}"
        )

    code_samples: List[str] = []
    labels: List[int] = []

    ext_map = {"c": ".c", "java": ".java", "python": ".py"}
    target_ext = ext_map.get(language, "")

    # Read human files (Class 0)
    human_files = [f for f in human_dir.iterdir() if f.is_file() and (not target_ext or f.name.endswith(target_ext))]
    print(f"[DATA] Found {len(human_files)} human-written files in {human_dir}")
    for f in human_files:
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
            if len(content.strip()) > 0:
                code_samples.append(content)
                labels.append(0)
        except Exception as exc:
            print(f"  Warning: Skipping {f.name}: {exc}")

    # Read AI files (Class 1)
    ai_files = [f for f in ai_dir.iterdir() if f.is_file() and (not target_ext or f.name.endswith(target_ext))]
    print(f"[DATA] Found {len(ai_files)} AI-generated files in {ai_dir}")
    for f in ai_files:
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
            if len(content.strip()) > 0:
                code_samples.append(content)
                labels.append(1)
        except Exception as exc:
            print(f"  Warning: Skipping {f.name}: {exc}")

    return code_samples, labels


def train(language: str, data_dir_str: str) -> int:
    data_dir = Path(data_dir_str)
    print("=" * 65)
    print(f"CodeAuthentic - Head Training Pipeline [{language.upper()}]")
    print("=" * 65)
    print(f"Language: {language}")
    print(f"Data Directory: {data_dir.resolve()}")
    print("-" * 65)

    code_samples, labels = load_dataset_from_disk(data_dir, language)

    if len(code_samples) < 20:
        print(f"[ERROR] Insufficient samples for training ({len(code_samples)} found). Minimum 20 required.")
        return 1

    unique_classes = set(labels)
    if len(unique_classes) < 2:
        print(f"[ERROR] Both human (0) and AI (1) samples are required. Found labels: {unique_classes}")
        return 1

    # Feature Extraction
    print(f"\n[1/4] Extracting 770-dim features using frozen CodeBERT ({language})...")
    X_list = []
    y_list = []

    for i, (code, label) in enumerate(zip(code_samples, labels)):
        try:
            feat = extract_features(code, language)
            X_list.append(feat)
            y_list.append(label)
            if (i + 1) % 25 == 0 or (i + 1) == len(code_samples):
                print(f"  Processed {i + 1}/{len(code_samples)} samples...")
        except Exception as exc:
            # Skip samples that don't pass token count threshold
            continue

    X = np.array(X_list)
    y = np.array(y_list)

    print(f"  Successfully extracted features for {len(X)} samples. Feature matrix shape: {X.shape}")

    # 70 / 15 / 15 Stratified Split
    print("\n[2/4] Splitting dataset into 70% Train, 15% Validation, 15% Test (Stratified)...")
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    print(f"  Train set: {len(X_train)} samples")
    print(f"  Validation set: {len(X_val)} samples")
    print(f"  Test set: {len(X_test)} samples")

    # Fit Pipeline (StandardScaler + LogisticRegression)
    print("\n[3/4] Fitting Logistic Regression head on top of frozen features...")
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced")),
    ])

    pipeline.fit(X_train, y_train)

    # Evaluate on Validation Set
    val_preds = pipeline.predict(X_val)
    print("\n" + "-" * 30 + " VALIDATION METRICS " + "-" * 30)
    print(f"  Accuracy:  {accuracy_score(y_val, val_preds):.4f}")
    print(f"  Precision: {precision_score(y_val, val_preds, zero_division=0):.4f}")
    print(f"  Recall:    {recall_score(y_val, val_preds, zero_division=0):.4f}")
    print(f"  F1 Score:  {f1_score(y_val, val_preds, zero_division=0):.4f}")

    # Evaluate on Test Set (reported in thesis)
    test_preds = pipeline.predict(X_test)
    print("\n" + "=" * 30 + " FINAL TEST METRICS (THESIS) " + "=" * 30)
    print(f"  Accuracy:  {accuracy_score(y_test, test_preds):.4f}")
    print(f"  Precision: {precision_score(y_test, test_preds, zero_division=0):.4f}")
    print(f"  Recall:    {recall_score(y_test, test_preds, zero_division=0):.4f}")
    print(f"  F1 Score:  {f1_score(y_test, test_preds, zero_division=0):.4f}")
    print("-" * 75)
    print(classification_report(y_test, test_preds, target_names=["Human (0)", "AI-Generated (1)"]))

    # Save fitted model
    HEADS_DIR.mkdir(parents=True, exist_ok=True)
    out_file = HEADS_DIR / f"{language}.joblib"
    joblib.dump(pipeline, out_file)
    print(f"\n[4/4] Model saved successfully to: {out_file.resolve()}")
    print("=" * 65)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Train CodeAuthentic classifier head.")
    parser.add_argument(
        "--language",
        choices=["c", "java", "python"],
        required=True,
        help="Programming language to train head for",
    )
    parser.add_argument(
        "--data",
        type=str,
        required=True,
        help="Path to dataset directory containing human/ and ai/ subfolders",
    )
    args = parser.parse_args()
    return train(args.language, args.data)


if __name__ == "__main__":
    sys.exit(main())

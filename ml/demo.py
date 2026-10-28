"""
CodeAuthentic - ML Demo Scorer.
Scores a sample source code file using the trained CodeBERT classifier head.

Usage:
  python -m ml.demo --file sample.py
  python -m ml.demo --file sample.c
  python -m ml.demo --file sample.java
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from ml.predictor import analyze, HeadNotTrainedError, CodeTooShortError


SAMPLE_SNIPPET = """# QuickSort implementation in Python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

if __name__ == "__main__":
    nums = [3, 6, 8, 10, 1, 2, 1]
    print(quicksort(nums))
"""


def main():
    parser = argparse.ArgumentParser(description="Score a source code file with CodeAuthentic.")
    parser.add_argument("--file", type=str, help="Path to source file (.c, .java, .py)")
    args = parser.parse_args()

    print("=" * 60)
    print("CodeAuthentic - AI Code Detection Demo")
    print("=" * 60)

    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"[ERROR] File not found: {file_path}")
            return 1
        code = file_path.read_text(encoding="utf-8", errors="ignore")
        filename = file_path.name
    else:
        print("[INFO] No file specified, scoring default Python snippet...")
        code = SAMPLE_SNIPPET
        filename = "quicksort_sample.py"

    print(f"Target File: {filename}")
    print("-" * 60)

    try:
        result = analyze(code, filename)
        prob = result["ai_probability"]
        risk = result["risk_level"]

        print(f"Detected Language:  {result['language'].upper()}")
        print(f"AI Probability:     {prob * 100:.2f}% ({prob})")
        print(f"Assigned Risk:      {risk} Risk")
        print("-" * 60)
        print("Note: Scores < 0.40 = Low, 0.40 - 0.70 = Medium, >= 0.70 = High.")
        print("=" * 60)
        return 0

    except HeadNotTrainedError as exc:
        print(f"\n[MODEL HEAD NOT YET TRAINED]\n{exc}")
        print("\nTo train the head using your dataset:")
        print("  1. Fetch human dataset from Hugging Face:")
        print("     python -m ml.fetch_dataset --language all --samples 500")
        print("  2. Place AI-generated companion code in dataset/<language>/ai/")
        print("  3. Run training:")
        print("     python -m ml.train_head --language <c|java|python> --data dataset/<language>")
        return 1

    except CodeTooShortError as exc:
        print(f"\n[VALIDATION FAILED]\n{exc}")
        return 1

    except Exception as exc:
        print(f"\n[ERROR]\n{exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

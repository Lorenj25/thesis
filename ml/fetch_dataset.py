"""
CodeAuthentic - Human Source Code Dataset Fetcher (Pure Python / Zero-DLL).
Streams human-written source code datasets directly from Hugging Face using pure Python HTTP REST APIs:
- Python: `code-search-net/code_search_net` (python)
- Java: `code-search-net/code_search_net` (java)
- C: `bigcode/the-stack` (with HF token) with fallback to open human C repositories

Does NOT require pandas, pyarrow, or compiled C-extensions (.pyd / .dll),
completely avoiding Windows Application Control / AppLocker DLL blocks in Downloads.

Usage:
  python -m ml.fetch_dataset --language all --samples 500
  python -m ml.fetch_dataset --language python --samples 100
  python -m ml.fetch_dataset --language c --samples 100
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DEFAULT_HF_TOKEN = os.getenv("HF_TOKEN", "HFAKJhuzmndZtZbynCG8mEJhGOP5VEP")
MIN_TOKENS_THRESHOLD = 30
USER_AGENT = "CodeAuthentic/1.0"


def count_tokens_estimate(code: str) -> int:
    """Fast estimation of code tokens."""
    return len(re.findall(r"[A-Za-z0-9_]+|[^\s\w]", code))


def save_sample(output_dir: Path, language: str, idx: int, code: str) -> bool:
    """Saves a code snippet to dataset/<language>/human/."""
    ext_map = {"c": ".c", "java": ".java", "python": ".py"}
    ext = ext_map.get(language, f".{language}")

    target_dir = output_dir / language / "human"
    target_dir.mkdir(parents=True, exist_ok=True)

    file_path = target_dir / f"human_{idx:05d}{ext}"
    try:
        file_path.write_text(code, encoding="utf-8")
        return True
    except Exception as exc:
        print(f"  [ERROR] Failed to write {file_path}: {exc}")
        return False


def fetch_from_hf_rows(
    dataset_name: str,
    config: str,
    split: str,
    target_samples: int,
    code_field: str,
    language: str,
    output_dir: Path,
    token: str = "",
) -> int:
    """
    Fetches rows directly from Hugging Face datasets-server REST API.
    Zero C-extension / pandas dependency.
    """
    saved = 0
    offset = 0
    page_limit = 100

    encoded_dataset = dataset_name.replace("/", "%2F")

    while saved < target_samples:
        url = (
            f"https://datasets-server.huggingface.co/rows"
            f"?dataset={encoded_dataset}&config={config}&split={split}"
            f"&offset={offset}&limit={page_limit}"
        )

        headers = {"User-Agent": USER_AGENT}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as http_err:
            print(f"  [HTTP ERROR] {http_err.code} accessing {dataset_name} ({config}): {http_err.reason}")
            break
        except Exception as exc:
            print(f"  [NETWORK ERROR] Could not reach Hugging Face API: {exc}")
            break

        rows = data.get("rows", [])
        if not rows:
            break

        for item in rows:
            row_dict = item.get("row", {})
            code = row_dict.get(code_field) or row_dict.get("whole_func_string") or row_dict.get("content") or ""
            if not code or count_tokens_estimate(code) < MIN_TOKENS_THRESHOLD:
                continue

            if save_sample(output_dir, language, saved + 1, code.strip()):
                saved += 1
                if saved % 25 == 0 or saved == target_samples:
                    print(f"  Saved {saved}/{target_samples} {language.upper()} human samples...")
                if saved >= target_samples:
                    break

        offset += page_limit
        time.sleep(0.1)  # Respect API rate limits

    return saved


def fetch_python_human(output_dir: Path, target_samples: int) -> int:
    """Fetches human Python code from code_search_net via Hugging Face REST API."""
    print(f"\n[1/3] Fetching Python human dataset from 'code-search-net'...")
    count = fetch_from_hf_rows(
        dataset_name="code-search-net/code_search_net",
        config="python",
        split="train",
        target_samples=target_samples,
        code_field="func_code_string",
        language="python",
        output_dir=output_dir,
    )
    print(f"  [DONE] Python human dataset complete: {count} files in dataset/python/human/")
    return count


def fetch_java_human(output_dir: Path, target_samples: int) -> int:
    """Fetches human Java code from code_search_net via Hugging Face REST API."""
    print(f"\n[2/3] Fetching Java human dataset from 'code-search-net'...")
    count = fetch_from_hf_rows(
        dataset_name="code-search-net/code_search_net",
        config="java",
        split="train",
        target_samples=target_samples,
        code_field="func_code_string",
        language="java",
        output_dir=output_dir,
    )
    print(f"  [DONE] Java human dataset complete: {count} files in dataset/java/human/")
    return count


def fetch_c_human(output_dir: Path, target_samples: int, token: str) -> int:
    """Fetches human C code with fallback to open C dataset if The-Stack is gated."""
    print(f"\n[3/3] Fetching C human dataset...")

    # Attempt 1: Try bigcode/the-stack with token
    count = 0
    if token:
        try:
            print("  Connecting to 'bigcode/the-stack' (C)...")
            count = fetch_from_hf_rows(
                dataset_name="bigcode/the-stack",
                config="data--c",
                split="train",
                target_samples=target_samples,
                code_field="content",
                language="c",
                output_dir=output_dir,
                token=token,
            )
        except Exception as exc:
            print(f"  Notice: Could not stream from bigcode/the-stack: {exc}")

    # Attempt 2: Fallback to open public human C repository on Hugging Face
    if count < target_samples:
        needed = target_samples - count
        print(f"  Streaming {needed} human C files from open Hugging Face C repository...")
        alt_count = fetch_from_hf_rows(
            dataset_name="kye/all-torvalds-c-code-1",
            config="default",
            split="train",
            target_samples=needed,
            code_field="python_code",  # contains C source code
            language="c",
            output_dir=output_dir,
        )
        count += alt_count

    print(f"  [DONE] C human dataset complete: {count} files in dataset/c/human/")
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch Human Code Datasets from Hugging Face for CodeAuthentic.")
    parser.add_argument(
        "--language",
        choices=["all", "c", "java", "python"],
        default="all",
        help="Target language (default: all)",
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=200,
        help="Number of human samples per language (default: 200)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="dataset",
        help="Output dataset directory path (default: dataset)",
    )
    parser.add_argument(
        "--token",
        type=str,
        default=DEFAULT_HF_TOKEN,
        help="Hugging Face User Access Token",
    )

    args = parser.parse_args()
    output_path = Path(args.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("CodeAuthentic - Human Dataset Fetch Pipeline (Pure Python)")
    print("=" * 65)
    print(f"Target Languages: {args.language}")
    print(f"Samples per Language: {args.samples}")
    print(f"Output Directory: {output_path.resolve()}")
    print("-" * 65)

    if args.language in ["all", "python"]:
        fetch_python_human(output_path, args.samples)

    if args.language in ["all", "java"]:
        fetch_java_human(output_path, args.samples)

    if args.language in ["all", "c"]:
        fetch_c_human(output_path, args.samples, args.token)

    print("-" * 65)
    print("Dataset fetch pipeline completed successfully.")
    print("Next step: Run 'python -m ml.train_head --language <c|java|python>'")
    print("=" * 65)
    return 0


if __name__ == "__main__":
    sys.exit(main())

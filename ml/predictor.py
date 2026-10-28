"""
CodeAuthentic - ML Predictor Module.
Feature extraction and AI probability inference using frozen CodeBERT representations.
Computes a 770-dimensional feature vector:
- 768-dim: mean-pooled last hidden state of unmasked tokens
- 2-dim: mean and std of masked-token negative log-likelihood (perplexity signal)
Passes features through fitted StandardScaler + LogisticRegression head.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Optional, Tuple
import numpy as np

# Risk level classification thresholds
RISK_LOW_MAX = 0.40
RISK_MEDIUM_MAX = 0.70
MIN_TOKENS = 30

EXT_TO_LANG = {
    ".c": "c",
    ".java": "java",
    ".py": "python",
}

MODEL_IDS = {
    "c": "neulab/codebert-c",
    "java": "neulab/codebert-java",
    "python": "neulab/codebert-python",
}

# Cache for loaded tokenizers and models
_TOKENIZERS: Dict[str, any] = {}
_MODELS: Dict[str, any] = {}
_HEADS: Dict[str, any] = {}

HEADS_DIR = Path(__file__).resolve().parent / "heads"


class CodeTooShortError(Exception):
    """Raised when submitted code contains fewer than 30 tokens."""
    pass


class HeadNotTrainedError(Exception):
    """Raised when the scikit-learn classifier head for a language has not been fitted."""
    pass


def preload_models() -> None:
    """
    Loads all three CodeBERT models and tokenizers into memory.
    Called once during FastAPI startup lifespan.
    """
    import torch
    from transformers import AutoModelForMaskedLM, AutoTokenizer

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[PRELOAD] Loading CodeBERT models on device: {device}")

    for lang, model_id in MODEL_IDS.items():
        if lang not in _TOKENIZERS:
            print(f"[PRELOAD] Loading tokenizer for {lang} ({model_id})...")
            _TOKENIZERS[lang] = AutoTokenizer.from_pretrained(model_id)

        if lang not in _MODELS:
            print(f"[PRELOAD] Loading model weights for {lang} ({model_id})...")
            try:
                model = AutoModelForMaskedLM.from_pretrained(model_id, device_map="auto")
            except Exception:
                model = AutoModelForMaskedLM.from_pretrained(model_id).to(device)
            model.eval()
            # Freeze all weights - study does NOT fine-tune CodeBERT weights
            for param in model.parameters():
                param.requires_grad = False
            _MODELS[lang] = model

    print("[PRELOAD] All CodeBERT models loaded and frozen successfully.")


def _get_tokenizer_and_model(language: str):
    """Retrieves or lazily initializes the tokenizer and model for a language."""
    import torch
    from transformers import AutoModelForMaskedLM, AutoTokenizer

    if language not in _TOKENIZERS or language not in _MODELS:
        model_id = MODEL_IDS.get(language)
        if not model_id:
            raise ValueError(f"Unsupported language: {language}")

        if language not in _TOKENIZERS:
            _TOKENIZERS[language] = AutoTokenizer.from_pretrained(model_id)

        if language not in _MODELS:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            try:
                model = AutoModelForMaskedLM.from_pretrained(model_id, device_map="auto")
            except Exception:
                model = AutoModelForMaskedLM.from_pretrained(model_id).to(device)
            model.eval()
            for param in model.parameters():
                param.requires_grad = False
            _MODELS[language] = model

    return _TOKENIZERS[language], _MODELS[language]


def check_context(code: str, language: str) -> int:
    """
    Tokenizes the code snippet only.
    Raises CodeTooShortError if fewer than MIN_TOKENS (30) tokens are found.
    Returns the total token count.
    """
    tokenizer, _ = _get_tokenizer_and_model(language)
    tokens = tokenizer.encode(code, add_special_tokens=False)
    if len(tokens) < MIN_TOKENS:
        raise CodeTooShortError(
            f"Code is too short ({len(tokens)} tokens). Minimum required is {MIN_TOKENS} tokens."
        )
    return len(tokens)


def extract_features(code: str, language: str) -> np.ndarray:
    """
    Extracts a 770-dimensional feature vector from code using frozen CodeBERT:
    - 510-token chunks with [CLS] and [SEP]
    - Batched forward pass: row 0 unmasked + 4 masked rows (every 4th token masked)
    - Mean-pooled last hidden state of unmasked row (768 values)
    - Mean and std of masked-token negative log-likelihood (2 values)
    - Average across chunks weighted by chunk length
    """
    import torch
    import torch.nn.functional as F

    tokenizer, model = _get_tokenizer_and_model(language)
    device = next(model.parameters()).device

    # Tokenize without special tokens
    tokens = tokenizer.encode(code, add_special_tokens=False)
    if len(tokens) < MIN_TOKENS:
        raise CodeTooShortError(f"Code contains {len(tokens)} tokens, fewer than {MIN_TOKENS} minimum.")

    # Split into chunks of 510 tokens (max 8 chunks)
    chunk_size = 510
    chunks = [tokens[i : i + chunk_size] for i in range(0, len(tokens), chunk_size)]
    if len(chunks) > 8:
        chunks = chunks[:8]

    # Drop tiny trailing chunk if smaller than 20 tokens (unless it's the only chunk)
    if len(chunks) > 1 and len(chunks[-1]) < 20:
        chunks.pop()

    chunk_features = []
    chunk_weights = []

    mask_token_id = tokenizer.mask_token_id or 103
    cls_token_id = tokenizer.cls_token_id or 0
    sep_token_id = tokenizer.sep_token_id or 2

    with torch.no_grad():
        for chunk in chunks:
            chunk_len = len(chunk)
            chunk_weights.append(chunk_len)

            # Construct inputs: row 0 unmasked, rows 1-4 with masked offsets
            input_seq = [cls_token_id] + chunk + [sep_token_id]
            seq_len = len(input_seq)

            batch_rows = [list(input_seq) for _ in range(5)]
            masked_positions_list = []

            # Rows 1 to 4 mask every 4th token with offsets 0, 1, 2, 3
            for offset in range(4):
                row_idx = offset + 1
                masked_indices = []
                for pos in range(1, seq_len - 1):  # exclude CLS and SEP
                    if (pos - 1) % 4 == offset:
                        batch_rows[row_idx][pos] = mask_token_id
                        masked_indices.append(pos)
                masked_positions_list.append(masked_indices)

            batch_tensor = torch.tensor(batch_rows, dtype=torch.long, device=device)
            attention_mask = torch.ones_like(batch_tensor)

            outputs = model(
                input_ids=batch_tensor,
                attention_mask=attention_mask,
                output_hidden_states=True,
            )

            # 1. Mean-pooled last hidden state of unmasked row 0 (768 values)
            last_hidden = outputs.hidden_states[-1]  # [5, seq_len, 768]
            unmasked_hidden = last_hidden[0, 1 : seq_len - 1, :]  # exclude CLS/SEP
            mean_hidden = unmasked_hidden.mean(dim=0).cpu().numpy()  # shape (768,)

            # 2. Masked-token negative log-likelihood (rows 1-4)
            logits = outputs.logits  # [5, seq_len, vocab_size]
            log_probs = F.log_softmax(logits, dim=-1)

            nlls = []
            for offset in range(4):
                row_idx = offset + 1
                positions = masked_positions_list[offset]
                for pos in positions:
                    true_token = input_seq[pos]
                    token_nll = -log_probs[row_idx, pos, true_token].item()
                    nlls.append(token_nll)

            if nlls:
                nll_mean = float(np.mean(nlls))
                nll_std = float(np.std(nlls))
            else:
                nll_mean = 0.0
                nll_std = 0.0

            chunk_vec = np.concatenate([mean_hidden, np.array([nll_mean, nll_std])])
            chunk_features.append(chunk_vec)

    # Weighted average across chunks by chunk length
    weights = np.array(chunk_weights, dtype=float)
    weights /= np.sum(weights)
    final_vector = np.sum([feat * w for feat, w in zip(chunk_features, weights)], axis=0)
    return final_vector


def predict(code: str, language: str) -> float:
    """
    Extracts 770-dim features and runs inference through the trained classifier head.
    Returns AI generation probability (0.0 to 1.0).
    """
    import joblib

    head_path = HEADS_DIR / f"{language}.joblib"
    if not head_path.exists():
        raise HeadNotTrainedError(
            f"Classifier head for language '{language}' not found at {head_path}. "
            f"Train it first using: python -m ml.train_head --language {language} --data dataset/{language}"
        )

    if language not in _HEADS:
        _HEADS[language] = joblib.load(head_path)

    head = _HEADS[language]
    features = extract_features(code, language).reshape(1, -1)
    probabilities = head.predict_proba(features)
    # class 1 = AI-generated, class 0 = human
    ai_prob = float(probabilities[0, 1])
    return ai_prob


def risk_level(score: float) -> str:
    """Classifies risk level based on AI generation probability."""
    if score < RISK_LOW_MAX:
        return "Low"
    elif score < RISK_MEDIUM_MAX:
        return "Medium"
    else:
        return "High"


def analyze(code: str, filename: str) -> Dict[str, any]:
    """
    Public entry point for source code submission analysis.
    Returns: {"language": str, "ai_probability": float, "risk_level": str}
    """
    _, ext = os.path.splitext(filename.lower())
    language = EXT_TO_LANG.get(ext)
    if not language:
        raise ValueError(f"Unsupported file extension '{ext}'. Allowed: .c, .java, .py")

    # Verify context length
    check_context(code, language)

    # Run prediction
    score = predict(code, language)
    risk = risk_level(score)

    return {
        "language": language,
        "ai_probability": round(score, 4),
        "risk_level": risk,
    }

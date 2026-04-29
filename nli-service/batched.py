"""
GPU-optimized batched NLI service for Clarify-AI (Intent-Sim strategy).
Mirrors the notebook's batched inference loop: builds all pairs up front,
runs them through DeBERTa-MNLI in fixed-size batches on the GPU, and uses
argmax over [contradiction, neutral, entailment] to decide equivalence.

Drop-in replacement for main.py — exposes the same /check_equivalence,
/batch_equivalence, and /health endpoints.
"""

import os
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# ── Silence the noisy auto_conversion background thread ──────────────
# microsoft/deberta-large-mnli uses sharded .bin weights, so the
# auto_conversion thread crashes with an OSError when it can't find a
# single pytorch_model.bin / model.safetensors.  The thread is non-
# essential (it only tries to open a safetensors-conversion PR on HF
# Hub), so we patch it to swallow the error silently.
import transformers.safetensors_conversion as _sc

_orig_auto_conversion = _sc.auto_conversion


def _quiet_auto_conversion(*args, **kwargs):
    try:
        return _orig_auto_conversion(*args, **kwargs)
    except OSError:
        return None


_sc.auto_conversion = _quiet_auto_conversion
# ─────────────────────────────────────────────────────────────────────

MODEL_NAME = "microsoft/deberta-large-mnli"
ENTAILMENT_LABEL = 2  # DeBERTa-MNLI: [contradiction, neutral, entailment]
BATCH_SIZE = int(os.getenv("NLI_BATCH_SIZE", "32"))
MAX_LENGTH = int(os.getenv("NLI_MAX_LENGTH", "512"))

tokenizer = None
model = None
device = None
use_fp16 = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tokenizer, model, device, use_fp16
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_fp16 = device.type == "cuda"
    print(f"Loading {MODEL_NAME} on {device} (fp16={use_fp16}, batch_size={BATCH_SIZE})...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    dtype = torch.float16 if use_fp16 else torch.float32
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME, use_safetensors=False, torch_dtype=dtype
    ).to(device)
    model.eval()
    print("Model loaded.")
    yield


app = FastAPI(title="Clarify-AI NLI Service (Batched GPU)", lifespan=lifespan)


def _run_pairs(pairs: list[tuple[str, str]]) -> tuple[list[int], list[float]]:
    """Run a list of (premise, hypothesis) pairs through the model in batches.

    Returns (predicted_labels, entailment_probabilities) aligned with `pairs`.
    """
    preds: list[int] = []
    probs_e: list[float] = []
    if not pairs:
        return preds, probs_e

    for start in range(0, len(pairs), BATCH_SIZE):
        batch = pairs[start : start + BATCH_SIZE]
        premises = [p[0] for p in batch]
        hypotheses = [p[1] for p in batch]

        inputs = tokenizer(
            premises,
            hypotheses,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=MAX_LENGTH,
        ).to(device)

        with torch.no_grad():
            logits = model(**inputs).logits

        batch_preds = torch.argmax(logits, dim=1).cpu().tolist()
        batch_probs = torch.softmax(logits.float(), dim=-1)[:, ENTAILMENT_LABEL].cpu().tolist()
        preds.extend(batch_preds)
        probs_e.extend(batch_probs)

    return preds, probs_e


class PairRequest(BaseModel):
    q: str
    a1: str
    a2: str


class PairResponse(BaseModel):
    equivalent: bool
    score_a_b: float
    score_b_a: float


class BatchRequest(BaseModel):
    q: str
    answers: list[str]


class BatchResponse(BaseModel):
    matrix: list[list[bool]]
    score_matrix: list[list[float]]


@app.post("/check_equivalence", response_model=PairResponse)
async def check_equivalence_endpoint(req: PairRequest):
    premise_a = f"{req.q} {req.a1}"
    premise_b = f"{req.q} {req.a2}"
    preds, probs = _run_pairs([(premise_a, premise_b), (premise_b, premise_a)])
    equivalent = preds[0] == ENTAILMENT_LABEL and preds[1] == ENTAILMENT_LABEL
    return PairResponse(equivalent=equivalent, score_a_b=probs[0], score_b_a=probs[1])


@app.post("/batch_equivalence", response_model=BatchResponse)
async def batch_equivalence_endpoint(req: BatchRequest):
    n = len(req.answers)
    matrix = [[False] * n for _ in range(n)]
    score_matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        matrix[i][i] = True
        score_matrix[i][i] = 1.0

    if n < 2:
        return BatchResponse(matrix=matrix, score_matrix=score_matrix)

    context_answers = [f"{req.q} {a}" for a in req.answers]

    pairs: list[tuple[str, str]] = []
    indices: list[tuple[int, int]] = []
    for i in range(n - 1):
        for j in range(i + 1, n):
            pairs.append((context_answers[i], context_answers[j]))
            pairs.append((context_answers[j], context_answers[i]))
            indices.append((i, j))

    preds, probs = _run_pairs(pairs)

    for k, (i, j) in enumerate(indices):
        pred_ij = preds[2 * k]
        pred_ji = preds[2 * k + 1]
        prob_ij = probs[2 * k]
        prob_ji = probs[2 * k + 1]

        score_matrix[i][j] = prob_ij
        score_matrix[j][i] = prob_ji

        # Semantic equivalence (Kuhn et al., 2023) requires *bidirectional*
        # entailment: A entails B AND B entails A. Using OR here merges
        # clusters whenever one direction is a false positive — which DeBERTa
        # produces often when premises share most of their tokens (e.g. same
        # question prefix + a short answer suffix).
        if pred_ij == ENTAILMENT_LABEL and pred_ji == ENTAILMENT_LABEL:
            matrix[i][j] = True
            matrix[j][i] = True

    return BatchResponse(matrix=matrix, score_matrix=score_matrix)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": str(device),
        "fp16": use_fp16,
        "batch_size": BATCH_SIZE,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

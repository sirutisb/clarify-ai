"""
NLI Backend Service for Clarify-AI (Intent-Sim strategy).
Uses DeBERTa-large-MNLI for bidirectional entailment checking.
"""

from fastapi import FastAPI
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from contextlib import asynccontextmanager

ENTAILMENT_LABEL = 2  # DeBERTa-MNLI: [contradiction, neutral, entailment]
MODEL_NAME = "microsoft/deberta-large-mnli"

# Global model/tokenizer (loaded on startup)
tokenizer = None
model = None
device = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tokenizer, model, device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading {MODEL_NAME} on {device}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, use_safetensors=False).to(device)
    model.eval()
    print("Model loaded.")
    yield


app = FastAPI(title="Clarify-AI NLI Service", lifespan=lifespan)


def check_entailment(premise: str, hypothesis: str) -> tuple[int, float]:
    """Returns (predicted_label, entailment_probability) for premise -> hypothesis."""
    inputs = tokenizer(premise, hypothesis, return_tensors="pt", truncation=True, max_length=512).to(device)
    with torch.no_grad():
        logits = model(**inputs).logits
    pred = torch.argmax(logits, dim=1).item()
    prob = torch.softmax(logits, dim=-1)[0][ENTAILMENT_LABEL].item()
    # DeBERTa-MNLI labels: [contradiction, neutral, entailment]
    return pred, prob


def are_equivalent(question: str, a1: str, a2: str) -> tuple[bool, float, float]:
    """Bidirectional entailment check. Returns (equivalent, score_a_b, score_b_a)."""
    premise_a = f"{question} {a1}"
    premise_b = f"{question} {a2}"
    pred_ab, score_a_b = check_entailment(premise_a, premise_b)
    pred_ba, score_b_a = check_entailment(premise_b, premise_a)
    equivalent = pred_ab == ENTAILMENT_LABEL and pred_ba == ENTAILMENT_LABEL
    return equivalent, score_a_b, score_b_a


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
    equivalent, score_a_b, score_b_a = are_equivalent(req.q, req.a1, req.a2)
    return PairResponse(equivalent=equivalent, score_a_b=score_a_b, score_b_a=score_b_a)


@app.post("/batch_equivalence", response_model=BatchResponse)
async def batch_equivalence_endpoint(req: BatchRequest):
    n = len(req.answers)
    matrix = [[False] * n for _ in range(n)]
    score_matrix = [[0.0] * n for _ in range(n)]

    if n == 0:
        return BatchResponse(matrix=matrix, score_matrix=score_matrix)

    context_answers = [f"{req.q} {a}" for a in req.answers]
    
    pairs = []
    indices = []

    for i in range(n):
        matrix[i][i] = True
        score_matrix[i][i] = 1.0
        for j in range(i + 1, n):
            # A -> B
            pairs.append((context_answers[i], context_answers[j]))
            indices.append((i, j, 'a_b'))
            # B -> A
            pairs.append((context_answers[j], context_answers[i]))
            indices.append((i, j, 'b_a'))

    if not pairs:
        return BatchResponse(matrix=matrix, score_matrix=score_matrix)

    batch_size = 9
    all_preds = []
    all_entailment_probs = []

    for k in range(0, len(pairs), batch_size):
        batch_pairs = pairs[k:k+batch_size]
        premises = [p[0] for p in batch_pairs]
        hypotheses = [p[1] for p in batch_pairs]

        inputs = tokenizer(
            premises, hypotheses, 
            padding=True, truncation=True, max_length=512, return_tensors="pt"
        ).to(device)

        with torch.no_grad():
            logits = model(**inputs).logits

        batch_preds = torch.argmax(logits, dim=1).cpu().tolist()
        probs = torch.softmax(logits, dim=-1)
        entailment_probs = probs[:, ENTAILMENT_LABEL].tolist()
        all_preds.extend(batch_preds)
        all_entailment_probs.extend(entailment_probs)

    # Populate score_matrix
    for idx_info, prob in zip(indices, all_entailment_probs):
        i, j, direction = idx_info
        if direction == 'a_b':
            score_matrix[i][j] = prob
        else:
            score_matrix[j][i] = prob

    # Populate equivalence matrix using paired argmax predictions
    # Pairs are ordered: a_b at even indices (0,2,4,...), b_a at odd indices (1,3,5,...)
    for k in range(0, len(all_preds), 2):
        i, j, _ = indices[k]
        pred_ab = all_preds[k]
        pred_ba = all_preds[k + 1]
        if pred_ab == ENTAILMENT_LABEL and pred_ba == ENTAILMENT_LABEL:
            matrix[i][j] = True
            matrix[j][i] = True

    return BatchResponse(matrix=matrix, score_matrix=score_matrix)


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME, "device": str(device)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Clarify-AI NLI Service

This directory contains the Natural Language Inference (NLI) backend service for Clarify-AI. It implements the "Intent-Sim" strategy by checking the semantic equivalence of generated answers. 

The service uses the `microsoft/deberta-large-mnli` model via Hugging Face Transformers to perform bidirectional entailment checking.

## Setup & Installation

1. Ensure you have Python installed (Python 3.10+ recommended).
2. It is recommended to use a virtual environment.
3. Install the required dependencies:

```bash
pip install -r requirements.txt
```

*(Note: If you have an NVIDIA GPU, ensure you install the appropriate PyTorch version with CUDA support to enable hardware acceleration for faster inference.)*

## Running the Service

Start the FastAPI server using the provided `main.py` script:

```bash
python main.py
```

Alternatively, run it directly with `uvicorn`:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The service will run on `http://localhost:8000`. Upon the first startup, it will download the `deberta-large-mnli` model weights (if not already cached) and load the model into memory.

## API Endpoints

### 1. Health Check
`GET /health`

Returns the current status, the model being used, and the compute device (`cpu` or `cuda`).

### 2. Check Equivalence (Pair)
`POST /check_equivalence`

Checks the semantic equivalence between two answers for a given question context.

**Request Body (`PairRequest`):**
```json
{
  "q": "What is the capital of France?",
  "a1": "The capital is Paris.",
  "a2": "Paris is the capital of France."
}
```

**Response (`PairResponse`):**
```json
{
  "equivalent": true,
  "score_a_b": 0.98,
  "score_b_a": 0.99
}
```

### 3. Batch Equivalence
`POST /batch_equivalence`

Checks the equivalence between a list of answers for a given question. This is highly optimized for batching and returns both a boolean equivalence matrix and the raw entailment score matrix.

**Request Body (`BatchRequest`):**
```json
{
  "q": "What is the capital of France?",
  "answers": [
    "Paris",
    "It is Paris.",
    "London"
  ]
}
```

**Response (`BatchResponse`):**
```json
{
  "matrix": [
    [true, true, false],
    [true, true, false],
    [false, false, true]
  ],
  "score_matrix": [
    [1.0, 0.98, 0.01],
    [0.96, 1.0, 0.02],
    [0.01, 0.01, 1.0]
  ]
}
```

## How It Works

The service evaluates equivalence by appending the question context to each answer and then checking bidirectional entailment (A entails B, and B entails A). 

If either direction yields an entailment probability above the defined threshold (`ENTAILMENT_THRESHOLD = 0.8`), the answers are considered equivalent.

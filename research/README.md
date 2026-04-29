# Research

The reproducible evaluation pipeline hosts the AmbigNQ-derived evaluation set, the oracle generation step, the Intent-SIM and Reasoning runs across Qwen 3.5 (2B / 4B / 9B), and the notebooks that produced the AUROC and budget-constrained accuracy figures provided in the research findings.

The web application that operationalises both strategies in a real-time UI lives at the repository root; see [`../README.md`](../README.md).

## Pipeline

The pipeline is structured as a sequence of Jupyter notebooks. Each stage writes its intermediate results back into the same flat per-sample record on disk, so any stage can be re-run on its own. All random operations use seed `42`.

```
preprocess.ipynb      Build the 400-question evaluation set from AmbigNQ dev (200 ambiguous +
                      200 unambiguous, seed=42), reformat to a flat schema, derive
                      gold_intent_question / gold_output_answer from nq_answer.

oracle_gen.ipynb      For each ambiguous sample, generate one oracle clarifying question that
                      distinguishes all gold interpretations and one clarifying response per
                      interpretation (the bipartite-matching setup). Computed once and reused
                      across model sizes and methods.

intent_{2,4,9}b       Intent-SIM pipeline (per model size): greedy clarifying question →
                      sample 10 intents at T=0.7 → bidirectional NLI clustering via the
                      DeBERTa-large-MNLI service → Shannon entropy over cluster proportions →
                      direct + clarified answers (few-shot, T=0).

reasoning_{2,4,9}b    Reasoning pipeline (per model size): single LLM call enumerating up to
                      six interpretations with self-reported probabilities → Shannon entropy
                      replaces the Intent-SIM cluster entropy. Direct + clarified evaluation
                      stages are identical to Intent-SIM, so both methods are scored under
                      matched conditions.
```

## Layout

| Path | Contents |
|---|---|
| `ambignq/` | AmbigNQ dev/train splits ([Min et al., 2020](https://arxiv.org/abs/2004.10645)) under their original LICENSE. Only `dev.json` is consumed by `preprocess.ipynb`. |
| `notebooks/` | The notebook pipeline above. |
| `extra/` | Inference-server reference (`INFERENCE_GUIDE.md`) and a worked single-question pipeline trace (`pipeline-example/1-…json` through `6-…json`) for the running "When was mercury discovered?" example. |
| `output/eval/` | Per-model intermediate and scored outputs (`{2,4,9}b/`), the combined samples (`combined_samples*.json`), and the shared oracle (`oracle_9b.json`). |
| `output/findings/` | Plain-text summaries of AUROC and budget-accuracy results per model size and method (`{size}_{intent-sim,think}.md`). |
| `output/logs/` | Raw run logs from each notebook execution. |

## Headline Results

400 questions (200 ambiguous, 200 unambiguous) from AmbigNQ dev, seed `42`. Setting B uses oracle clarification (bipartite matching against the dataset's gold interpretations) so that performance differences in the clarified setting reflect each method's ability to incorporate clarification context, not its ability to imagine alternatives.

| Model | Method | AUROC | Direct (b=0%) | b=20% | b=100% |
|---|---|---:|---:|---:|---:|
| Qwen 3.5 2B | Intent-SIM | 0.527 | 8.75% | 9.00% | 10.75% |
| Qwen 3.5 2B | **Reasoning** | **0.574** | 9.25% | 9.50% | 11.00% |
| Qwen 3.5 4B | Intent-SIM | 0.501 | 20.25% | 20.50% | 23.50% |
| Qwen 3.5 4B | **Reasoning** | **0.608** | 20.50% | 21.50% | 22.00% |
| Qwen 3.5 9B | Intent-SIM | 0.551 | 23.75% | 26.00% | 27.75% |
| Qwen 3.5 9B | **Reasoning** | **0.599** | 23.75% | 25.00% | 28.50% |

Reasoning beats Intent-SIM on AUROC at every model size (largest margin at 4B, +0.108) while using 1 LLM call per question instead of 11 and dropping the NLI dependency. Intent-SIM still wins on absolute accuracy gain at specific operating points: the 9B model at `b=20%` achieves a headline 9.5% relative uplift over the direct-answer baseline.

See `output/findings/` for the per-configuration breakdowns.

## Reproducing

### Prerequisites

- Python 3.10+ with the packages in [`requirements.txt`](./requirements.txt). PyTorch 2.10 with CUDA 12.8 was used.

  ```bash
  python3 -m venv .venv
  source .venv/bin/activate          # Windows: .venv\Scripts\activate
  pip install -r requirements.txt
  jupyter lab                        # or: jupyter notebook
  ```

- An OpenAI-compatible LLM endpoint serving Qwen 3.5 GGUFs. [`llama.cpp`](https://github.com/ggerganov/llama.cpp)'s `llama-server` on a single NVIDIA RTX 2080 (8 GB VRAM) was used; see [`extra/INFERENCE_GUIDE.md`](./extra/INFERENCE_GUIDE.md) for the exact launch command and recommended sampling parameters (`temperature=1.0, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0`).

  Download the Unsloth GGUF quants from Hugging Face:

  | Model | HF repo | Quant used |
  |---|---|---|
  | 2B | [`unsloth/Qwen3.5-2B-GGUF`](https://huggingface.co/unsloth/Qwen3.5-2B-GGUF) | `Qwen3.5-2B-Q8_0.gguf` (2.01 GB) |
  | 4B | [`unsloth/Qwen3.5-4B-GGUF`](https://huggingface.co/unsloth/Qwen3.5-4B-GGUF) | `Qwen3.5-4B-Q6_K.gguf` (3.53 GB) |
  | 9B | [`unsloth/Qwen3.5-9B-GGUF`](https://huggingface.co/unsloth/Qwen3.5-9B-GGUF) | `Qwen3.5-9B-Q4_K_M.gguf` (5.68 GB) |

- For Intent-SIM only: the DeBERTa-large-MNLI FastAPI service in [`../nli-service/`](../nli-service/) running on `localhost:8000`. The Reasoning method has no external dependency.

### Run order

1. `notebooks/preprocess.ipynb` — produces the 400-question flat dataset.
2. `notebooks/oracle_gen.ipynb` — generates the shared oracle clarifying Q&A using the 9B model (reused across all later stages).
3. For each model size `{2b, 4b, 9b}`:
   - `notebooks/intent_{size}.ipynb` — Intent-SIM stages.
   - `notebooks/reasoning_{size}.ipynb` — Reasoning stages.
4. Each scoring notebook writes summaries to `output/findings/`.

Stages write back into the same per-sample records, so individual stages can be re-run without restarting the pipeline.

## Data and Attribution

`ambignq/` redistributes the AmbigNQ development and training splits from [Min et al., 2020](https://arxiv.org/abs/2004.10645) under the LICENSE file shipped alongside them. Only `dev.json` is consumed by the evaluation pipeline; `train.json` is included for completeness.

The Intent-SIM method reproduced here is from Zhang & Choi, *Clarify When Necessary* ([arXiv:2311.09469](https://arxiv.org/abs/2311.09469)). The Reasoning method is my novel contribution.

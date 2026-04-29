# Unsloth Qwen GGUF Quants

Download from Hugging Face:

| Model | HF repo | Quant used |
|---|---|---|
| 2B | https://huggingface.co/unsloth/Qwen3.5-2B-GGUF | Qwen3.5-2B-Q8_0.gguf (2.01 GB) |
| 4B | https://huggingface.co/unsloth/Qwen3.5-4B-GGUF | Qwen3.5-4B-Q6_K.gguf (3.53 GB) |
| 9B | https://huggingface.co/unsloth/Qwen3.5-9B-GGUF | Qwen3.5-9B-Q4_K_M.gguf (5.68 GB) |

# Recommended Sampling Params
Thinking mode for text tasks:
temperature=1.0, top_p=0.95, top_k=20, min_p=0.0, presence_penalty=1.5, repetition_penalty=1.0

# Example API Endpoint
curl http://localhost:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "unsloth/Qwen3.5-0.8B-GGUF",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant with deep reasoning capabilities."},
      {"role": "user", "content": "Why is the sky blue?"}
    ],
    "temperature": 1.0,
    "presence_penalty": 1.5,
    "stream": true
  }'

# Running Qwen with recommended settings on thinking with reasoning budget
./llama-server -m models/unsloth/Qwen3.5-9B-GGUF/Qwen3.5-9B-Q4_K_M.gguf --temp 1.0 --top-p 0.95 --top-k 20 --min-p 0.0 --presence-penalty 1.5 --repeat-penalty 1.0 -c 8192 -fa on -ngl 99 --reasoning on --reasoning-budget 1000 --reasoning-budget-message "\nReasoning budget reached. Now let's output the interpretations we have."
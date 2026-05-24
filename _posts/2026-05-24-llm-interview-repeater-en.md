---
title: "LLM Interview Questions: Deep Dive into the \"Repeater/Repetition Problem\" in Large Language Models"
date: 2026-05-24
permalink: /posts/2026/05/llm-interview-repeater-en/
categories:
  - Interview
tags:
  - LLM常见面试题
  - 复读机问题
---

# LLM Interview Questions: Deep Dive into the "Repeater/Repetition Problem" in Large Language Models

During the development and deployment of Large Language Models (LLMs), the **"Repeater/Repetition Problem"** (where a model gets stuck in an endless loop of repeating the same phrases or sentences) is an extremely classic and high-frequency issue. It is a favorite topic among interviewers for AI/NLP algorithm roles, as it tests your understanding of both decoding mechanics and training dynamics.

This article provides a comprehensive guide to understanding, explaining, and solving the repetition problem in LLMs, serving as a perfect cheat sheet for your next interview.

---

## 1. What is the Repetition Problem?

In Natural Language Generation (NLG) tasks, models sometimes fall into a "dead loop", repeating a specific word, phrase, or sentence infinitely. For example:
> *"The weather is nice today, let's go to the park. Go to the park. Go to the park. Go to the park..."*

This phenomenon represents a severe degradation in text generation quality and ruins the user experience.

---

## 2. Why Do LLMs Become "Repeaters"?

Explaining this successfully in an interview requires dividing the root causes into **model architecture** and **decoding strategies**.

### A. Autoregressive Mechanism & Positive Feedback Loops
Most modern LLMs adopt a decoder-only autoregressive architecture, meaning that the next token is generated conditionally based on all previous tokens:
$$P(x_t \mid x_{<t})$$
If the model generates a slightly repetitive phrase early on due to minor noise or positional bias, this phrase is immediately **appended back to the context** as input for the next step.
In the **Self-Attention mechanism**, these repeated tokens start sharing extremely high attention weights with each other. This creates a **Positive Feedback Loop** (self-reinforcement). The probability space of the vocabulary gets heavily compressed, leaving the model with no choice but to predict the exact same tokens recursively.

### B. Pitfalls of Decoding Strategies
*   **Greedy Search**: Selects the token with the absolute highest probability at each step. This deterministic approach is highly vulnerable to local traps. If the model enters a repetitive state once, it will loop indefinitely because the path is deterministic.
*   **Suboptimal Sampling Parameters (Low Temperature / Low Top-P)**: A low Temperature sharpens the logits distribution:
    $$\text{softmax}(\text{logits} / T)$$
    When $T \to 0$, it behaves like greedy search, eliminating generation diversity and trapping the model in highly repetitive tokens.

### C. Training Data Bias
Pre-training web corpora contain massive duplicates, including:
*   Website templates, boilerplate text, headers/footers, and legal disclaimers.
*   Spam emails and auto-generated duplicate code blocks.
*   Crash logs or failed scraper outputs.

If the model overfits these **repetitive patterns** during pre-training or Supervised Fine-Tuning (SFT), it will naturally trigger the "repeater mode" when encountering similar contexts.

### D. Attention Sinks and Context Degradation
When the generated text length approaches or exceeds the model’s **maximum context window**, or when the model lacks long-context fine-tuning, the attention mechanism starts to degrade. The model experiences "Attention Sinks" or loses track of long-range dependencies. In this "distracted" state, the model falls back to repeating safe, local, and familiar segments to continue generation.

---

## 3. Inference-Side Solutions (Decoding Adjustments)

Interviewers love to hear about **practical parameter tuning** and **logit-level modifications**. Here are the four most common solutions applied in production (e.g., in Hugging Face Transformers, vLLM, or llama.cpp).

### 1. Repetition Penalty
This is a standard technique in modern inference engines. The core idea is to **penalize the logits of tokens that have already appeared in the generated sequence before passing them to the Softmax function.**

For each token $i$ in the vocabulary, if it has already occurred in the generated sequence $g$, its logit is adjusted as:
$$\text{logits}_i = \begin{cases} 
\text{logits}_i / \theta & \text{if } \text{logits}_i > 0 \\
\text{logits}_i \times \theta & \text{if } \text{logits}_i \le 0 
\end{cases}$$
Where $\theta \ge 1.0$ is the penalty parameter (usually set between $1.05$ and $1.2$).
*   If $\theta = 1.0$, there is no penalty.
*   If $\theta > 1.0$, the logits of previously generated tokens are scaled down, lowering their probability after Softmax and pushing the model to select new tokens.

### 2. Frequency and Presence Penalties
Popularized by the OpenAI API, these parameters allow for fine-grained control over repetition using a linear subtraction on logits:
$$\text{logits}'_i = \text{logits}_i - (c_i \times \mu_{\text{freq}} + \text{sgn}(c_i) \times \mu_{\text{pres}})$$
Where:
*   $c_i$ is the **cumulative count** of token $i$ in the generated text.
*   $\text{sgn}(c_i)$ is the sign function (equals $1$ if $c_i > 0$, else $0$).
*   $\mu_{\text{freq}}$ is the **Frequency Penalty**. It scales linearly with how often the token has already appeared, preventing word stacking.
*   $\mu_{\text{pres}}$ is the **Presence Penalty**. It applies a one-time fixed penalty to any token that has appeared at least once, encouraging the model to introduce completely new topics.

### 3. No-Repeat N-Gram (N-Gram Blocking)
This is a hard constraint applied during Beam Search or standard generation.
*   **Mechanism**: The generation engine tracks all N-Grams generated so far. If choosing a candidate token $w$ creates an N-Gram that has already appeared, its logit is set to $-\infty$ (probability becomes $0$).
*   **Pros/Cons**: Setting `no_repeat_ngram_size = 3` completely eliminates repeating phrases of length 3 or more. It works perfectly for summarization and translation but can ruin technical writing or code generation where specific phrases/keywords must be repeated.

### 4. Contrastive Search
Contrastive Search is a state-of-the-art decoding method. At each step, it considers both the model's output probability and a **degeneration penalty** measured by the maximum cosine similarity between the candidate token's hidden state and those of the history context:
$$x_t = \arg\max_{u \in V^{(k)}} \left\{ (1 - \alpha) \cdot P(u \mid x_{<t}) - \alpha \cdot \max_{j} \text{Sim}(h_u, h_{x_j}) \right\}$$
Where $h_u$ is the representation of candidate $u$, and $h_{x_j}$ is the history hidden state. This forces the generated text to be both probable and semantically diverse.

---

## 4. Training-Side Solutions (Root Cause Mitigations)

While inference-side tweaks are quick and easy, they are temporary fixes. Truly resolving the issue requires training-level updates.

1.  **Rigorous Data Deduplication**
    Use algorithms like **MinHash + LSH (Locality Sensitive Hashing)** or **Suffix Arrays** on web corpora before pre-training to prune duplicate paragraphs, machine-generated noise, and boilerplate text.
2.  **High-Quality SFT Data Filtering**
    Filter out repetitive, templated, or low-diversity responses in Supervised Fine-Tuning datasets. Rewrite low-quality data using human annotators or advanced LLMs (e.g., GPT-4).
3.  **Alignment Optimization (RLHF / DPO)**
    *   In **RLHF** (Reinforcement Learning from Human Feedback), train the Reward Model to penalize repetitive outputs.
    *   In **DPO** (Direct Preference Optimization), construct preference pairs where the repetitive response is mapped to `rejected_response` and the clean response is `chosen_response`. This forces the model weights to steer away from repetition pathways.

---

## 5. Interview Answer Summary Cheat Sheet

If an interviewer asks: *"How would you debug and solve the repeater/repetition problem in an LLM?"*

> **Structured Response Outline**:
> 1.  **Define**: Categorize it as a common generation degeneration issue in NLG.
> 2.  **Analyze Root Causes**:
>     *   *First*, the autoregressive feedback loop reinforces early repetition via Self-Attention.
>     *   *Second*, deterministic decoding (like greedy search) or low Temperatures lock the model into local optima.
>     *   *Third*, model overfits repetitive patterns found in noisy pre-training web data.
> 3.  **Inference-Side Patches**: Detail `Repetition Penalty` (multiplicative logit scaling), `Frequency/Presence Penalties` (additive logit deduction), and `No-Repeat N-Gram` (hard block), mentioning `Contrastive Search` as a semantic diversity decoding alternative.
> 4.  **Training-Side Cure**: Implement data deduplication (MinHash/LSH), clean SFT dialogue datasets, and apply alignment techniques (DPO/RLHF) to penalize repetition loops.

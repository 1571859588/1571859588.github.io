---
title: "Deep Dive into the \"Repeater/Repetition Problem\" in Large Language Models"
date: 2026-05-24
permalink: /posts/2026/05/llm-interview-repeater-en/
categories:
  - Interview
tags:
  - LLM Common Interview Questions
  - Repeater/Repetition Problem
  - Why Models become a Repeater when training by SFT
toc: true
---

## 1. What is the \"Repeater/Repetition\" Problem?

In Natural Language Generation (NLG) tasks, models may sometimes fall into a \"dead loop\" (infinite loop), repeatedly generating the same sentence, phrase, or paragraph.

For example:

> \"Today's weather is good, let's go to the park. go to the park. go to the park. ...\"

This kind of self-reinforcing loop makes the model unable to terminate the generation process, which severely degrades the user experience and is a classic symptom of text generation quality degradation.

## 2. Why Do LLMs Become \"Repeaters\"?

To address this question, we must analyze it from the perspective of both the underlying model architecture and the decoding mechanism.

### 2.1 Autoregressive Nature and Self-Reinforcing Loops

Large Language Models (LLMs) typically adopt a decoder-only architecture, meaning that each generated token is conditioned on the probability distribution of all previously generated tokens:
$$P(x_t \mid x_{<t})$$

Due to the nature of the self-attention mechanism, a newly generated token will establish a strong correlation with historically repeated tokens. This significantly amplifies the attention weights of identical words, forming a positive feedback loop. Ultimately, the probability space becomes severely compressed, forcing the model to predict the same tokens repeatedly.

### 2.2 The Limitation of Decoding Strategies

- **Greedy Search**: Greedy search always selects the token with the highest probability at each step. While this method is deterministic, it is highly prone to getting trapped in local optima. Once the context enters a repetitive grammatical structure, the model is bound to follow this deterministic path, repeating the same text indefinitely.

  > As pointed out in a recent paper, greedy decoding lacks the ability to escape from repetitive loops. Due to the self-reinforcing effect, the probability of repetition increases monotonically with the number of past repetitions, eventually stabilizing near a certain upper bound and causing the model to repeat endlessly.

- **Suboptimal Sampling Parameters (e.g., Low Temperature or Top-p)**: If the temperature is set too low, the logits distribution becomes extremely sharpened. This allows high-probability tokens to monopolize the generation space, reducing randomness and easily causing the model to degrade into a repetitive state similar to greedy search.

### 2.3 The Bias of Pre-training & Fine-tuning datasets

The training corpora for LLMs originate from vast amounts of web data. This raw data is often filled with repetitive content, such as:

- Website templates, page headers/footers, and copyright disclaimers;
- Spam ads, automated emails, and machine-generated repetitive code blocks;
- Error logs captured by web crawlers.

If a model overfits these repetitive patterns during pre-training or Supervised Fine-Tuning (SFT), it will easily trigger this \"repetitive behavior\" when encountering similar contexts during inference.

### 2.4 Context Degradation & Attention Sinks

When the length of the generated text approaches or exceeds the context window of the model, or when the model lacks sufficient long-context instruction tuning, the self-attention mechanism may experience the \"attention sink\" effect on early tokens or lose the ability to track long-range dependencies. Consequently, the model enters a \"distracted\" state where it struggles to generate logical, novel content, resorting instead to copying familiar, local, and \"safe\" sequences to continue generation.

### 2.5 Prolonged SFT Training

A paper by ByteDance points out that prolonged SFT training leads to rapid overfitting. This not only triggers the repetition problem but also severely degrades prompt-following capability and generation diversity.

## 3. How to Deal with It on the Inference-Side?

### 3.1 Repetition Penalty

The underlying principle is to penalize the logits of tokens that have already been generated before calculating the Softmax probability distribution.

For each token $i$ in the vocabulary, if it has already appeared in the generated text sequence $g$, its logit is adjusted as follows:
$$
\text{logits}_i = \begin{cases} 
\text{logits}_i / \theta & \text{if } \text{logits}_i > 0 \\
\text{logits}_i \times \theta & \text{if } \text{logits}_i \le 0 
\end{cases}
$$
where $\theta \ge 1.0$ is the penalty factor, which is commonly set between $1.05$ and $1.2$.

- When $\theta = 1.0$, there is no penalty.
- When $\theta > 1.0$, the logits of previously generated tokens are scaled down proportionally. This significantly decreases their probability after Softmax, encouraging the model to select alternative, ungenerated tokens.

### 3.2 Presence Penalty & Frequency Penalty

These two penalties, popularized by OpenAI, offer more fine-grained control over repetitive behavior by applying a linear subtraction to the logits:
$$
\text{logits}'_i = \text{logits}_i - (c_i \times \mu_{\text{freq}} + \text{sgn}(c_i) \times \mu_{\text{pres}})
$$
where:

- $c_i$ is the cumulative occurrence count of token $i$ in the generated text.
- $\text{sgn}(c_i)$ is the sign function (which equals $1$ if $c_i > 0$, and $0$ otherwise).
- $\mu_{\text{freq}}$ is the **Frequency Penalty**. As a token's frequency increases, the penalty grows linearly, making it suitable for preventing the repetitive stacking of high-frequency words.
- $\mu_{\text{pres}}$ is the **Presence Penalty**. As long as a token has appeared at least once, it receives a one-time fixed penalty, which is effective for guiding the model to introduce new topics and generate diverse vocabulary.

### 3.3 No-Repeat N-Gram

This hard constraint is commonly applied in Beam Search or standard text generation.

- **Mechanism**: At each decoding step, the model maintains a registry of all generated N-Grams. If selecting a candidate token $w$ forms an N-Gram that has already appeared in the history, the logit of $w$ is forcibly set to $-\infty$ (reducing its probability to zero).
- **Pros and Cons**: Setting `no_repeat_ngram_size = 3` completely prevents consecutive repetitions of three or more tokens, which is highly effective for machine translation and summarization tasks. However, for technical writing or programming tasks that require repeating specific terminology or code structures, this rigid constraint can severely damage the quality of the generated text.

### 3.4 Contrastive Search

Contrastive Search is an advanced decoding method proposed in recent years.

At each generation step, it balances the model's output probability against a **degeneration penalty**, which is measured by the maximum cosine similarity (representing the anisotropy penalty) between the candidate token's hidden state and those of the previously generated context:
$$
x_t = \arg\max_{u \in V^{(k)}} \left\{ (1 - \alpha) \cdot P(u \mid x_{<t}) - \alpha \cdot \max_{j} \text{Sim}(h_u, h_{x_j}) \right\}
$$
where $h_u$ is the representation vector (hidden state) of candidate token $u$, $h_{x_j}$ represents the hidden states of past tokens, and $\alpha$ is a hyperparameter that controls the tradeoff between generation probability and repetition rejection. This ensures that the generated token is both highly probable and maintains a healthy degree of semantic separation from the preceding context.

### 3.5 Other Inference Adjustments

1. **Adjust Temperature**: Slightly increase the Temperature parameter to enhance randomness and generation diversity;
2. **Sampling Methods**: Employ Top-$k$ or Top-$p$ sampling strategies instead of greedy search to break deterministic loops;
3. **Beam Search with Constraints**: Use Beam Search with early stopping thresholds, which is a generalized approach shown to be effective across various types of repetitive generation.

## 4. How to Eradicate Repetition on the Training-Side?

While tweaking parameters on the inference side is quick and simple, it is merely a temporary patch rather than a fundamental cure. To address the root cause, training-side interventions are essential. The most effective methods include:

1. **Extremely Rigorous Data Deduplication**:
   During the pre-training stage, we can leverage algorithms like **MinHash + LSH** and **Suffix Arrays** to de-duplicate trillion-token corpora, removing boilerplate web templates, automated spam, and machine-generated repetitive structures.

2. **High-Quality SFT Dataset Cleaning**:
   During the Supervised Fine-Tuning (SFT) phase, we must eliminate samples with monotonous formats or high frequencies of repetitive phrasing in multi-turn dialogues. Rewriting these samples—either through manual curation or using advanced LLMs (e.g., GPT-4)—ensures that the fine-tuning corpus remains diverse and concise.

3. **Best Practices in SFT Training**:
   - **Moderate Learning Rate**: Avoid setting the learning rate too high during SFT;
   - **Strict Epoch/Step Control**: Closely monitor and limit the number of SFT training epochs;
   - **Early Stopping**: Implement early stopping as soon as early signs of overfitting (e.g., repeating behaviors) emerge.

4. **Alignment via RLHF/DPO**:
   - **RLHF (Reinforcement Learning from Human Feedback)**: Assign low rewards to responses containing repetitive loops, training the Reward Model to learn a negative preference against repetition;
   - **DPO (Direct Preference Optimization)**: Construct preference triples in the format of `(prompt, chosen_response, rejected_response)`, placing repetitive texts in the `rejected_response` and clean, diverse texts in the `chosen_response`. This directly penalizes the attention paths associated with repetitive generation during parameter updates.
   
   > For example, ByteDance's **SEAWEED** model effectively addresses this problem by combining SFT with preference alignment (RLHF/DPO).

## 5. Interview Response Cheat Sheet

If an interviewer asks: *"How would you diagnose and solve the 'repeater/repetition' problem in Large Language Models?"*

Here is a highly structured, professional answer outline to impress them:

1. **Acknowledge and Categorize**: 
   Define it as a classic NLG (Natural Language Generation) degradation phenomenon. Clarify that it stems from two main fronts: *decoding-side constraints* (local traps) and *model-side fitting bias* (overfitting repetitive data distributions).
2. **Explain the Root Causes**:
   - **Autoregressive Nature & Attention Amplification**: decoder-only models generate tokens sequentially. Once a repetitive sequence begins, the Self-Attention mechanism amplifies the weights of these repeated tokens, creating a positive feedback loop that heavily compresses the probability space.
   - **Decoding Strategy Limitations**: Deterministic decoding methods like Greedy Search lack the ability to escape repetitive patterns. Similarly, extremely low temperature settings or narrow Top-$p$ bounds stifle generation diversity.
   - **Data and Overfitting Bias**: Trillion-token pre-training or fine-tuning datasets are often contaminated with boilerplate web headers, automated crawler logs, and templated code. Prolonged SFT training causes the model to overfit these patterns, triggering repetitive behaviors.
3. **Propose Inference-Side Fixes (Fast Mitigation)**:
   - Introduce **Repetition Penalty** (multiplicative logit division) and **Frequency/Presence Penalties** (additive linear logit subtraction) to lower the probability of previously generated words.
   - Implement **No-Repeat N-Gram** as a hard physical constraint to completely block phrase repetitions.
   - Mention **Contrastive Search** as an advanced semantic search method that incorporates anisotropy penalties to keep the generated text semantically distinct from the historical context.
4. **Propose Training-Side Cures (Fundamental Resolution)**:
   - **Upstream**: Implement rigorous pre-training data deduplication using MinHash + LSH and Suffix Arrays.
   - **Midstream**: Clean SFT dialogue datasets, reducing learning rates, and executing early stopping as soon as repetition signs appear.
   - **Downstream**: Apply alignment algorithms (RLHF or DPO) using preference triples where repetitive sequences are explicitly put in the `rejected` set to suppress these attention pathways.

## References

1. **A Contrastive Framework for Neural Text Generation** (Su et al., 2022) — *Introduced Contrastive Search and analyzed the degradation/repetition of greedy decoding.*
2. **ByteDance Technical Report** (2024) — *Discussed SFT overfitting issues, the repetition problem in dialogue agents, and alignment strategies such as DPO.*
3. **The Curious Case of Neural Text Degeneration** (Holtzman et al., 2019) — *The foundational paper analyzing text degeneration and introducing Nucleus (Top-p) Sampling.*


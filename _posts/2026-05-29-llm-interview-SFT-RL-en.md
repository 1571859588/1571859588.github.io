---
title: "Why Does LLM Performance Temporarily Decline and Then Recover During RL Post-Training?"
date: 2026-05-29
permalink: /posts/2026/05/llm-interview-sft-rl-en/
categories:
  - LLM Interview
tags:
  - SFT and RL Tradeoffs
  - Post-Training Dynamics
  - Classic LLM Interview Questions
toc: true
---

During the post-training phase of Large Language Models (LLMs), a highly intriguing phenomenon often occurs: when transitioning from Supervised Fine-Tuning (SFT) to Reinforcement Learning (RL) (such as RLHF, RLAIF, or GRPO), the model's out-of-distribution (OOD) performance on test datasets initially **declines** before **recovering** and eventually **outperforming** the SFT baseline. 

This U-shaped performance trajectory is a classic post-training question frequently asked in top-tier LLM algorithm interviews (e.g., at ByteDance, Alibaba, and Zhipu AI). It directly tests your deep understanding of the mathematical and geometric optimization landscapes of both the SFT and RL training stages.

![U-Shaped Performance Curve during SFT-to-RL transition](/images/blogs/2026-05-29-llm-interview-SFT-RL-en.assets/image-20260529145901727.png)

In this blog post, we will dissect the underlying mechanics behind this phenomenon, drawing on recent theoretical and empirical breakthroughs.

---

## 1. Introduction: The Post-Training Pipeline

A standard pipeline for post-training large language models (such as GPT-4, Claude, and DeepSeek-R1) involves two sequential stages: 
1. **Supervised Fine-Tuning (SFT)** to teach the model to follow instructions and generate standard answers.
2. **Reinforcement Learning (RL)** (e.g., RLHF, RLAIF, or RLVR/GRPO) to align the model with human preferences or enhance its reasoning capabilities.

However, this sequential transition introduces a core question: *Why does the model's performance on test datasets temporarily drop at the beginning of the RL phase, only to recover and ultimately exceed the SFT baseline as training progresses?*

---

## 2. Phase 1: Why Does Performance Drop Initially?

### 2.1 The Objective Conflict and Mathematical Non-Decouplability
A 2026 research paper by Huawei Technologies (*On the Non-decoupling of Supervised Fine-tuning and Reinforcement Learning in Post-training*) mathematically demonstrates that SFT and RL are **inherently coupled (non-decouplable) in essence**. Specifically, the paper proves that regardless of which training phase comes first, the subsequent phase will inevitably disrupt the representation and knowledge learned during the initial phase.

The underlying reason lies in their conflicting mathematical objectives:
- **SFT Objective**: Minimizes the negative log-likelihood (NLL) of tokens, forcing the model to precisely match the token distribution of the training data.
- **RL Objective**: Maximizes the expected reward, focusing strictly on whether the final generated output achieves a high reward score, regardless of the token-level generation path.

Even if SFT training has fully converged to a low loss, the cross-entropy (SFT) loss will inevitably rise once RL training begins. This mathematical phenomenon is empirically verified in Qwen3-0.6B models, where the cross-entropy loss spikes immediately at the start of RL training, occasionally even exceeding the loss of the pre-trained base model, leading to a temporary decline in test-set performance.

### 2.2 Parameter Space Re-shaping & Catastrophic Forgetting
From the perspective of the parameter space:
- SFT pulls the model's weights toward a specific subspace that memorizes the empirical distribution of the fine-tuning dataset.
- Since RL is solely driven by maximizing rewards, it forces the model's parameters to migrate toward a different region of the parameter space, overriding SFT-learned token-level features. This phenomenon is known as **catastrophic forgetting**.

An intuitive analogy is that SFT is like a student **memorizing standard answers** for an exam. The closer the student mimics the reference keys, the lower the training loss. RL, however, is like requiring the student to **explore and solve problems independently**. RL only evaluates the correctness of the final outcome (the reward) and allows the student to find alternative, creative solution paths. When the model is abruptly switched from "rote-memorization mode" to "active-exploration mode," it initially struggles to adapt, causing its test-set scores to plummet.

---

## 3. Phase 2: Why Does Performance Recover and Surge?

### 3.1 SVD Analysis: Singular Vector Rotation in Weight Matrices
Recent work (*RL Is Neither a Panacea Nor a Mirage: Understanding Supervised vs. Reinforcement Learning Fine-Tuning for LLMs*) provides a deeper geometric explanation using **Singular Value Decomposition (SVD)** of the model's weight matrices ($W = U \Sigma V^T$):
1. **Generalization Depends on Directions**: Researchers discovered that the model's generalization capability is not determined by the magnitude of its singular values ($\Sigma$), but rather by the **direction of its singular vectors** ($U$ and $V$).
2. **SFT Causes Vector Rotation**: During aggressive SFT training, the singular vectors corresponding to the dominant principal components (the largest and smallest singular values) undergo a rotation that degrades out-of-distribution (OOD) generalization.
3. **RL Re-aligns the Vectors**: Surprisingly, subsequent RL training rotates these singular vector directions back to a more robust orientation, especially in the shallow (lower) and deep (upper) layers of the network.
4. **Causal Evidence**: To verify this causally, researchers conducted an intervention: they took the high-performing RL-tuned model and replaced its weight matrices' singular vectors with those from the SFT model. As a result, the model's OOD accuracy on the Llama-3.2-11B model plummeted from **16.2% to 10.6%** (with cross-entropy loss increasing by over 1.3%). This proves that the new geometric directions recovered by RL are the primary drivers of generalization.

### 3.2 Reward Variance-Driven Implicit Regularization
Most importantly, RL exhibits an **implicit regularization effect** driven by **reward variance**. 

When the model is highly uncertain about a particular sample, the variance of rewards across multiple generated rollouts (answers) is typically very high. Under RL objectives (such as policy gradients), a higher reward variance naturally scales down the magnitude of the gradient updates for those uncertain samples. This acts as a "self-adaptive braking system"—in highly uncertain representation regions, the parameter updates are extremely conservative, preventing the disruption of pre-existing knowledge. Conversely, in highly confident regions with low reward variance, the parameters update rapidly.

### 3.3 What DOES NOT Drive the Performance Recovery?
A common misconception is that the recovery of generalization during RL is primarily driven by:
1. **The KL Divergence Penalty**: The KL penalty is designed to keep the RL policy close to the SFT reference policy. However, ablation studies show that even when the KL penalty is completely removed, the model's performance still recovers (though the training process itself becomes highly unstable).
2. **Chain-of-Thought (CoT) Reasoning**: Some hypothesize that the performance gains are solely due to longer reasoning trajectories. Yet, even on short-context tasks without CoT, the model still exhibits a robust recovery of generalization.

These experiments demonstrate that the **implicit regularization mechanism driven by reward variance** is the actual dominant force behind this performance recovery.

---

## 4. Key Engineering Takeaways and Best Practices

### 4.1 Stop SFT Early: The Danger of Over-SFT
If SFT training is carried out for too long, the model severely overfits the training dataset. This pulls the model's parameters too far into the SFT empirical distribution space. Consequently:
- The RL phase requires significantly more steps to pull the parameters back toward a generalizable state, and in some cases, the model may never fully recover.
- **Industry Best Practice**: Instead of waiting for SFT to fully converge, teams often start RL training from an **intermediate SFT checkpoint**. For example, empirical studies on the Llama-3.2-11B model show that its OOD generalization peaks at only **20% of the full SFT training trajectory**; continuing SFT beyond this point actually degrades the downstream RL potential.

### 4.2 RFT (Reinforcement Fine-Tuning) vs. SFT in Continual Learning
Another profound finding from *Reinforcement Fine-Tuning Naturally Mitigates Forgetting in Continual Post-Training* is that **Reinforcement Fine-Tuning (RFT)** is inherently more resilient to catastrophic forgetting than SFT:
- In continual learning scenarios, SFT leads to severe catastrophic forgetting, causing a sharp drop in performance on previous tasks.
- In contrast, RFT can retain performance on previous tasks without requiring any explicit data replay strategies, closely approaching the performance of joint multi-task training.
- This demonstrates that the reinforcement learning paradigm is inherently more friendly to long-term knowledge retention and continual adaptation.

---

## 5. Interview Cheat Sheet: How to Answer Like a Pro

When asked: *"Why does an LLM's performance decline initially and then recover during reinforcement learning following SFT?"*

Here is a structured, professional outline to structure your answer:

1. **Acknowledge the Core Conflict**:
   Explain that SFT and RL have fundamentally different optimization objectives that are mathematically coupled (as proven by Huawei in 2026). SFT minimizes token-level negative log-likelihood (memorizing a specific empirical distribution), while RL maximizes expected reward (optimizing for the final outcome). This mismatch creates a temporary performance drop during the transition.
2. **Explain the Initial Drop (Phase 1: Degradation)**:
   - **Parameter Space Re-shaping & Catastrophic Forgetting**: The RL objective forces the parameters to shift away from the SFT subspace, overriding the precise token-level distribution matching learned in SFT.
   - **Singular Vector Rotation**: SVD analysis reveals that SFT causes the singular vectors (orientation) of weight matrices to rotate away from optimal generalization configurations.
3. **Explain the Recovery and Surge (Phase 2: Restoration)**:
   - **Singular Vector Re-alignment**: RL rotates the singular vector directions back to highly robust, generalizable orientations (especially in shallow and deep layers). Replacing RL singular vectors with SFT ones causes accuracy to plummet (e.g., Llama-3.2-11B dropping from 16.2% to 10.6%).
   - **Reward Variance-Driven Implicit Regularization**: Higher reward variance on uncertain samples naturally scales down gradients, acting as a self-adaptive braking system that protects old knowledge while allowing fast learning in confident regions.
4. **Offer Strategic Recommendations**:
   - **Avoid Over-SFT**: Use intermediate SFT checkpoints (e.g., stopping at 20% training progress) rather than fully converged ones to initiate RL.
   - **Highlight RFT**: Point out that RFT is naturally more resilient to catastrophic forgetting in continual learning setups than SFT due to this implicit variance regularization.

This explanation shows that the U-shaped curve is not a simple "forget-and-relearn" process, but rather a representation-level shift where the model transitions from a **memorization-driven representation** to a **generalization-driven reasoning mode**.

---

## References

1. **On the Non-decoupling of Supervised Fine-tuning and Reinforcement Learning in Post-training** (Huawei Technologies, 2026) — *Proves the mathematical non-decouplability of SFT and RL, demonstrating that sequential training inevitably leads to cross-entropy loss spikes during the RL phase.*
2. **RL Is Neither a Panacea Nor a Mirage: Understanding Supervised vs. Reinforcement Learning Fine-Tuning for LLMs** (August 2025) — *Uses Singular Value Decomposition (SVD) to analyze representation space changes, proving that singular vector rotation, rather than singular value magnitude, drives generalization recovery in RL.*
3. **Reinforcement Fine-Tuning Naturally Mitigates Forgetting in Continual Post-Training** (Lai et al., 2025) — *Demonstrates that RFT naturally mitigates catastrophic forgetting in continual learning settings compared to SFT, thanks to a reward variance-driven implicit regularization mechanism.*
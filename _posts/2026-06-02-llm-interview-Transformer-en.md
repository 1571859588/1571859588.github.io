---
title: "Deep Dive into the Transformer Architecture: A Comprehensive Interview Guide"
date: 2026-06-02
permalink: /posts/2026/06/llm-interview-transformer-en/
categories:
  - LLM Interview
tags:
  - Transformer Architecture
  - Multi-Head Attention
  - Layer Normalization
  - Interview Preparation
toc: true
---

As the foundational architecture behind modern Large Language Models (LLMs), the Transformer has revolutionized natural language processing by capturing long-range dependencies and global context more effectively than recurrent architectures. Consequently, deep conceptual and mathematical understanding of the Transformer is one of the most frequently tested topics in LLM algorithm interviews (e.g., at top-tier companies like Xiaomi, ByteDance, and Alibaba).

This blog post dissects a series of core, low-level questions asked during an LLM algorithm group interview at Xiaomi. Through these questions, we will explore not only the standard answers but also the underlying mathematical and structural design principles of the Transformer, bridging the gap between basic preparation and deep engineering intuition.

---

## 1. Global Architecture of the Transformer

The Transformer model, introduced by Vaswani et al. in the seminal paper *"Attention Is All You Need"*, is based entirely on attention mechanisms, discarding recurrence and convolutions. At a macro level, the original architecture consists of an encoder-decoder framework:

- **Encoder Stack**: Composed of $N$ identical blocks (typically $N=6$). Each block contains two main sub-layers:
  1. A **Multi-Head Self-Attention (MHSA)** mechanism.
  2. A position-wise **Feed-Forward Network (FFN)**.
- **Decoder Stack**: Also composed of $N$ identical blocks. Each block contains three sub-layers:
  1. A **Masked Multi-Head Self-Attention** mechanism (to prevent positions from attending to subsequent positions during autoregressive generation).
  2. An **Encoder-Decoder Cross-Attention** mechanism (which performs attention over the encoder stack's outputs).
  3. A position-wise **Feed-Forward Network (FFN)**.

*(Note: While the original Transformer is an encoder-decoder model designed for sequence-to-sequence tasks like translation, modern autoregressive LLMs—such as the GPT, LLaMA, and DeepSeek series—typically adopt a decoder-only architecture where the cross-attention layer is omitted.)*

Below is the structural diagram of the Transformer model architecture.

![The Transformer model architecture](/images/blogs/2026-06-02-llm-interview-Transformer-en/transformer_architecture.png)
*Figure 1: The Transformer - model architecture (Source: Vaswani et al., 2017). The encoder (left) maps an input sequence of symbol representations to a sequence of continuous representations, which the decoder (right) then uses to generate an output sequence of symbols one token at a time.*

---

## 2. Shape and Dimensions of Input Vectors

This question tests your understanding of the tensor dimensions and data flow as they pass through the Transformer's layers. Let us trace the shape of the tensors step by step:

1. **Input Token Sequence**: The raw text is tokenized into a sequence of token IDs. For a batch of input sequences, the tensor shape is:
   $$
   [B, S]
   $$
   where $B$ is the **batch size** and $S$ is the **sequence length** ($seq\_len$).
2. **Word Embedding Projection**: The token IDs are mapped via an embedding lookup matrix $W_e \in \mathbb{R}^{V \times D}$ (where $V$ is the vocabulary size and $D$ is the hidden/embedding dimension, e.g., $D=4096$ in LLaMA-7B) to continuous representations. The resulting tensor shape is:
   $$
   [B, S, D]
   $$
3. **Multi-Head Attention (MHA) Layers**: In MHA, the input tensor is projected into Query ($Q$), Key ($K$), and Value ($V$) tensors using linear matrices. For $h$ attention heads, the projection shapes are split into:
   $$
   [B, h, S, d_k]
   $$
   where $d_k = D / h$ is the dimension of each head. The attention map computation results in a shape of $[B, h, S, S]$. After calculating the weighted combination of values, the output heads are concatenated back to:
   $$
   [B, S, h \times d_k] \rightarrow [B, S, D]
   $$
   This concatenated representation is then projected via the output projection matrix $W^O \in \mathbb{R}^{D \times D}$. Because MHA utilizes linear transformations and combinations across the feature dimension, it does not alter the spatial sequence length $S$ or the final hidden dimension $D$.

### Practical Example
Consider the Chinese sentence: `"我爱机器学习"` (I love machine learning).
- Under character-level tokenization, this sequence has a length $S = 6$.
- If the model's hidden dimension $D$ is $4096$, the tensor shape after embedding is $[1, 6, 4096]$ for a single sentence.
- If we process a batch of size $B$, the input embedding tensor shape is $[B, 6, 4096]$.

---

## 3. Why Scale Attention Dot-Products by $\sqrt{d_k}$?

In the scaled dot-product attention formula:
$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$
why is the scaling factor $1/\sqrt{d_k}$ necessary? The answer lies in the optimization behavior of the Softmax function and initial parameter variance.

### 3.1 Mitigating Gradient Vanishing in Softmax
The Softmax function for a vector $z$ is defined as:
$$
\text{softmax}(z)_i = \frac{e^{z_i}}{\sum_{j} e^{z_j}}
$$
When the components of the input vector $z$ have large values, the Softmax output distribution becomes extremely sharp (pushing the maximum value close to 1 and others to 0). In these extreme regions, the gradients of the Softmax function with respect to its inputs approach zero:
$$
\frac{\partial \text{softmax}(z)_i}{\partial z_j} \approx 0
$$
This leads to the **gradient vanishing problem** during backpropagation, halting the training process.

To understand why the dot products grow large, assume that the components of $q$ and $k$ are independent random variables with mean $0$ and variance $1$. The dot product is:
$$
q \cdot k = \sum_{i=1}^{d_k} q_i k_i
$$
The mean and variance of this dot product are:
$$
\mathbb{E}[q \cdot k] = 0
$$
$$
\text{Var}(q \cdot k) = d_k
$$
Thus, as the head dimension $d_k$ increases, the variance of the dot product grows linearly, meaning the values of $QK^T$ can span a very wide range. By dividing the dot product by $\sqrt{d_k}$, we scale the variance back to $1$:
$$
\text{Var}\left(\frac{q \cdot k}{\sqrt{d_k}}\right) = \frac{1}{d_k} \text{Var}(q \cdot k) = \frac{d_k}{d_k} = 1
$$
This normalization keeps the magnitude of the inputs to the Softmax function stable, ensuring healthy gradient flow.

As noted by Vaswani et al. (2017):
> *"We suspect that for large values of $d_k$, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients. To counteract this effect, we scale the dot products by $1/\sqrt{d_k}$."*

### 3.2 Embedding Scaling by $\sqrt{D}$
A related trick in the original Transformer implementation is multiplying the output of the embedding layer by $\sqrt{D}$ before adding positional encodings:
```python
x = embedding(tokens) * math.sqrt(hidden_dim) + positional_encoding
```
The reason is twofold:
1. **Variance Calibration**: Under Xavier initialization, the weights of the embedding matrix have a variance of $1/D$. Thus, the elements of the embedding vectors have a variance of $1/D$. Multiplying by $\sqrt{D}$ scales the variance of these features back to approximately $1.0$, stabilizing early training layers.
2. **Signal Preservation**: Positional encodings are fixed or learned values bounded between $[-1, 1]$. Without scaling, the magnitude of the embedding vectors (which decays as $D$ grows under standard initializations) would be dominated by the positional encodings. Scaling by $\sqrt{D}$ ensures that semantic information is not drowned out by spatial positional information when they are added together.

---

## 4. Layer Normalization: Which Dimension is Normalized?

Layer Normalization (LN) is a crucial component that stabilizes training in deep architectures. To answer which dimension LN normalizes, we must compare it to Batch Normalization (BN).

For an input tensor of shape $[B, S, D]$ (Batch, Sequence Length, Hidden Dimension):
- **Batch Normalization (BN)**: Normalizes across the batch ($B$) and sequence ($S$) dimensions for each feature channel independently.
- **Layer Normalization (LN)**: Calculates the mean and variance across the feature (hidden) dimension $D$ for each individual token in each batch sequence. 

Mathematically, for a single token vector $x \in \mathbb{R}^D$ at a specific batch and sequence position, LN computes:
$$
\mu = \frac{1}{D} \sum_{i=1}^D x_i
$$
$$
\sigma^2 = \frac{1}{D} \sum_{i=1}^D (x_i - \mu)^2
$$
$$
\hat{x}_i = \frac{x_i - \mu}{\sqrt{\sigma^2 + \epsilon}}
$$
$$
y_i = \gamma_i \hat{x}_i + \beta_i
$$
where $\gamma, \beta \in \mathbb{R}^D$ are learnable scale and shift parameters initialized to $1$ and $0$ respectively.

Thus, **Layer Normalization is applied along the last dimension (the hidden/feature dimension $D$)**. It computes the mean and variance for each token embedding individually and does not pool statistics across different batch items or sequence positions. Consequently:
- The dimensions of the learnable parameters $\gamma$ and $\beta$ in the LayerNorm layer are both equal to $D$.
- LayerNorm is highly suitable for variable-length sequences because the normalization statistics are computed per token position, independent of other sequences in the batch.

---

## References

1. **Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention Is All You Need.** *Advances in Neural Information Processing Systems, 30.*
   - *Role in this post*: The foundational paper introducing the Transformer architecture, scaled dot-product attention, multi-head attention, and the overall encoder-decoder framework. It provides the core mathematical justification for scaling by $1/\sqrt{d_k}$ and multiplying embeddings by $\sqrt{d_{\text{model}}}$.
2. **Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). Layer Normalization.** *arXiv preprint arXiv:1607.06450.*
   - *Role in this post*: The paper that proposed Layer Normalization as an alternative to Batch Normalization. It explains the mathematical formulation of LN and why it is well-suited for recurrent architectures and sequence-to-sequence learning tasks.
3. **Glorot, X., & Bengio, Y. (2010). Understanding the difficulty of training deep feedforward neural networks.** *Proceedings of the Thirteenth International Conference on Artificial Intelligence and Statistics.*
   - *Role in this post*: Introduced "Xavier initialization" (Glorot initialization). It provides the mathematical context for why embedding matrices initialized with variance $1/D$ require scaling by $\sqrt{D}$ to restore variance to 1.
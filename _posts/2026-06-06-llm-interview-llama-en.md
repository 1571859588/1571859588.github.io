---
title: "Absolute vs. Relative Position Embeddings: The Deep Connection Between Vanilla Transformer and LLaMA's RoPE"
date: 2026-06-06
permalink: /posts/2026/06/llm-interview-llama-en/
categories:
  - LLM Interview
tags:
  - Positional Encoding
  - Rotary Position Embedding
  - Transformer Architecture
  - LLaMA
  - Interview Preparation
toc: true
---

A common question that candidates struggle to answer deeply in top-tier LLM algorithm interviews (e.g., Kuaishou's Kuaistar program, ByteDance, and Alibaba) is: **"What is the difference and connection between the positional encodings in the Vanilla Transformer and LLaMA?"**

While most candidates can state that the Vanilla Transformer uses absolute sinusoidal positional encoding and LLaMA uses Rotary Position Embedding (RoPE), few can explain the deep mathematical connection between them. Specifically, many fail to answer how RoPE is derived from the sinusoidal encoding, and how it represents relative position using absolute rotation.

This post will dissect this question step-by-step. We will break down the mathematical formulations, provide intuitive derivations, and explain how LLaMA implements RoPE, all explained in a way that is accessible even to readers with a high school level of mathematics.

---

## 1. Positional Encoding in the Global Transformer Architecture

Before diving into the math, let's understand where positional information is injected in the overall architecture. 

In a standard sequence processing model, Self-Attention is **position-invariant**. This means that if we shuffle the order of the words in a sentence, the Self-Attention output values remain identical (only shuffled accordingly). However, word order is crucial for language (e.g., *"Not bad"* vs. *"Bad, not"*). Therefore, we must inject position information.

### 1.1 Position Injection in the Vanilla Transformer
In the original Transformer architecture (Vaswani et al., 2017), position information is added directly to the input word embeddings.
*   **Location**: At the very bottom of both the Encoder and Decoder stacks.
*   **Formula**:
    $$
    X_{\text{final}} = X_{\text{embedding}} + PE
    $$
*   **Reference Diagram**: 

    ![The Transformer model architecture](/images/blogs/2026-06-02-llm-interview-Transformer-en/transformer_architecture.png)

    > *Figure 1: The Transformer - model architecture (Source: Vaswani et al., 2017). The encoder (left) maps an input sequence of symbol representations to a sequence of continuous representations, which the decoder (right) then uses to generate an output sequence of symbols one token at a time.* 
    > Note that in this original encoder-decoder architecture, "Positional Encoding" is added to both the "Input Embedding" and "Output Embedding" at the bottom of the respective stacks.

### 1.2 Position Injection in LLaMA (RoPE)
In LLaMA (Touvron et al., 2023), instead of adding positional vectors at the input layer, position information is applied directly within the Self-Attention layer of each Decoder block.
*   **Location**: Inside the Multi-Head Attention module, right before computing the dot product between the Query ($Q$) and Key ($K$) vectors.
*   **Formula**:
    $$
    \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{\tilde{Q}\tilde{K}^T}{\sqrt{d_k}}\right)V
    $$
    where $\tilde{Q} = R(Q, t)$ and $\tilde{K} = R(K, s)$ represent the Query and Key vectors rotated by their respective position-based matrices.

---

## 2. Vanilla Transformer: Sinusoidal Absolute Position Encoding

The Vanilla Transformer uses absolute positional encodings, where each token position $t$ is mapped to a unique vector of dimension $D$ using sine and cosine functions.

### 2.1 The Formulation
For a token at absolute position $t$, the elements of its positional encoding vector $PE_t \in \mathbb{R}^D$ are defined as:
$$
\begin{align*}
PE_{(t, 2i)} &= \sin\left(\theta_i \cdot t\right) = \sin\left(\frac{t}{10000^{\frac{2i}{D}}}\right) \\
PE_{(t, 2i+1)} &= \cos\left(\theta_i \cdot t\right) = \cos\left(\frac{t}{10000^{\frac{2i}{D}}}\right)
\end{align*}
$$
where:
*   $t$ is the token's position in the sequence ($t = 0, 1, 2, \dots, S-1$).
*   $i$ is the dimension index ($i = 0, 1, \dots, D/2 - 1$).
*   $\theta_i = \frac{1}{10000^{\frac{2i}{D}}}$ is a scaling factor that determines the frequency of the wave for that dimension pair.

---

### 2.2 Why Use Sine and Cosine? (High School Trigonometry Proof)

Vaswani et al. (2017) stated that they chose these sinusoidal functions because:
> *"We hypothesized it would allow the model to easily learn to attend by relative positions, since for any fixed offset $k$, $PE_{t+k}$ can be represented as a linear function of $PE_t$."*

Let's prove this statement step-by-step using high school trigonometric addition formulas. 

Recall the angle addition formulas:
$$
\begin{align*}
\sin(\alpha + \beta) &= \sin\alpha \cos\beta + \cos\alpha \sin\beta \\
\cos(\alpha + \beta) &= \cos\alpha \cos\beta - \sin\alpha \sin\beta
\end{align*}
$$

Let's look at a single 2D dimension pair $(2i, 2i+1)$ of the positional embedding at position $t + k$:
$$
PE_{t+k} = \begin{bmatrix} \sin(\theta_i(t+k)) \\ \cos(\theta_i(t+k)) \end{bmatrix} = \begin{bmatrix} \sin(\theta_i t + \theta_i k) \\ \cos(\theta_i t + \theta_i k) \end{bmatrix}
$$

Using the trigonometric addition formulas, we expand the components:
1.  **Sine component**:
    $$
    \sin(\theta_i t + \theta_i k) = \sin(\theta_i t)\cos(\theta_i k) + \cos(\theta_i t)\sin(\theta_i k)
    $$
2.  **Cosine component**:
    $$
    \cos(\theta_i t + \theta_i k) = \cos(\theta_i t)\cos(\theta_i k) - \sin(\theta_i t)\sin(\theta_i k)
    $$

Now, we can rewrite this system of linear equations in matrix form:
$$
\begin{bmatrix}
\sin(\theta_i (t + k)) \\
\cos(\theta_i (t + k))
\end{bmatrix}
=
\begin{bmatrix}
\cos(\theta_i k) & \sin(\theta_i k) \\
-\sin(\theta_i k) & \cos(\theta_i k)
\end{bmatrix}
\begin{bmatrix}
\sin(\theta_i t) \\
\cos(\theta_i t)
\end{bmatrix}
$$

Let's denote the transformation matrix as $R_k^{(i)}$:
$$
R_k^{(i)} = \begin{bmatrix}
\cos(\theta_i k) & \sin(\theta_i k) \\
-\sin(\theta_i k) & \cos(\theta_i k)
\end{bmatrix}
$$
Thus:
$$
PE_{t+k} = R_k PE_t
$$
This mathematically proves that $PE_{t+k}$ is a linear function of $PE_t$. The transformation matrix $R_k$ depends *only* on the relative distance offset $k$, and is completely independent of the absolute position $t$.

---

### 2.3 The Clock Analogy (Intuitive Explanation)

To understand this physically, imagine a clock:
*   The positional embedding at position $t$ is like a clock hand pointing at a certain angle $\theta_i t$.
*   If we move forward by $k$ steps, the new positional embedding is simply the hand rotated by an angle of $\theta_i k$.
*   The matrix $R_k^{(i)}$ is a **2D rotation matrix** that performs this clockwise rotation.

---

## 3. LLaMA: Rotary Position Embedding (RoPE)

LLaMA replaces absolute positional encodings with **Rotary Position Embedding (RoPE)** (Su et al., 2021). The core idea of RoPE is to implement relative position encoding by applying a rotation matrix directly to the Query and Key vectors.

### 3.1 What is a 2D Rotation Matrix? (High School Primer)

In a 2D plane, if you have a point with coordinates $(x, y)$ and you rotate it counterclockwise around the origin $(0,0)$ by an angle $\theta$, its new coordinates $(x', y')$ are calculated using the rotation matrix:
$$
\begin{bmatrix} x' \\ y' \end{bmatrix} = \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix} \begin{bmatrix} x \\ y \end{bmatrix}
$$

#### Concrete Numerical Example
Let's take a point $P = (1, 0)$ and rotate it counterclockwise by $\theta = 90^\circ$ ($\pi/2$ radians).
*   $\cos(90^\circ) = 0$
*   $\sin(90^\circ) = 1$

Applying the matrix:
$$
\begin{bmatrix} x' \\ y' \end{bmatrix} = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix} \begin{bmatrix} 1 \\ 0 \end{bmatrix} = \begin{bmatrix} 0 \\ 1 \end{bmatrix}
$$
The rotated point is $(0, 1)$, which is exactly $90^\circ$ counterclockwise from $(1, 0)$ on the y-axis.

---

### 3.2 The RoPE Formulation

Let $q_t \in \mathbb{R}^D$ be the Query vector at position $t$, and $k_s \in \mathbb{R}^D$ be the Key vector at position $s$.

RoPE divides the $D$-dimensional vector into $D/2$ pairs of 2-dimensional vectors. For each 2D pair index $j$ (where $j = 1, 2, \dots, D/2$), it rotates the vector by an angle of $\theta_j \cdot t$ (for Query) or $\theta_j \cdot s$ (for Key).

The rotation matrix $R_{\Theta, t}^D$ is a block-diagonal matrix composed of $D/2$ separate 2D rotation matrices:
$$
R_{\Theta, t}^D = \begin{bmatrix}
\cos(\theta_1 t) & -\sin(\theta_1 t) & 0 & 0 & \dots & 0 & 0 \\
\sin(\theta_1 t) & \cos(\theta_1 t) & 0 & 0 & \dots & 0 & 0 \\
0 & 0 & \cos(\theta_2 t) & -\sin(\theta_2 t) & \dots & 0 & 0 \\
0 & 0 & \sin(\theta_2 t) & \cos(\theta_2 t) & \dots & 0 & 0 \\
\vdots & \vdots & \vdots & \vdots & \ddots & \vdots & \vdots \\
0 & 0 & 0 & 0 & \dots & \cos(\theta_{D/2} t) & -\sin(\theta_{D/2} t) \\
0 & 0 & 0 & 0 & \dots & \sin(\theta_{D/2} t) & \cos(\theta_{D/2} t)
\end{bmatrix}
$$
The rotated Query and Key vectors are computed as:
$$
\tilde{q}_t = R_{\Theta, t}^D q_t, \quad \tilde{k}_s = R_{\Theta, s}^D k_s
$$

---

### 3.3 Proof: How RoPE Encodes Relative Distance

The Self-Attention mechanism calculates the similarity between Query and Key using their dot product (inner product). Let's see what happens to the dot product of the rotated vectors $\tilde{q}_t$ and $\tilde{k}_s$:
$$
\langle \tilde{q}_t, \tilde{k}_s \rangle = \tilde{q}_t^T \tilde{k}_s = \left( R_{\Theta, t}^D q_t \right)^T \left( R_{\Theta, s}^D k_s \right) = q_t^T \left( R_{\Theta, t}^D \right)^T R_{\Theta, s}^D k_s
$$

Let's compute the core matrix multiplication $\left( R_{\Theta, t}^D \right)^T R_{\Theta, s}^D$. Since $R$ is a block-diagonal matrix, we can analyze the multiplication for a single 2D block $j$ independently.

The transpose of a rotation matrix is its inverse (since rotation matrices are orthogonal):
$$
\left(R_{\Theta, t}^{(j)}\right)^T = \begin{bmatrix} \cos(\theta_j t) & \sin(\theta_j t) \\ -\sin(\theta_j t) & \cos(\theta_j t) \end{bmatrix} = R_{\Theta, -t}^{(j)}
$$

Now, multiply the transposed matrix at position $t$ by the matrix at position $s$:
$$
\left(R_{\Theta, t}^{(j)}\right)^T R_{\Theta, s}^{(j)} = \begin{bmatrix}
\cos(\theta_j t) & \sin(\theta_j t) \\
-\sin(\theta_j t) & \cos(\theta_j t)
\end{bmatrix}
\begin{bmatrix}
\cos(\theta_j s) & -\sin(\theta_j s) \\
\sin(\theta_j s) & \cos(\theta_j s)
\end{bmatrix}
$$

Let's compute the matrix multiplication step-by-step:
1.  **Top-left element**:
    $$
    \cos(\theta_j t)\cos(\theta_j s) + \sin(\theta_j t)\sin(\theta_j s) \\
    = \cos(\theta_j s - \theta_j t) = \cos(\theta_j(s - t))
    $$
2.  **Top-right element**:
    $$
    \cos(\theta_j t)(-\sin(\theta_j s)) + \sin(\theta_j t)\cos(\theta_j s) \\
    = -(\sin(\theta_j s)\cos(\theta_j t) - \cos(\theta_j s)\sin(\theta_j t)) = -\sin(\theta_j(s - t))
    $$
3.  **Bottom-left element**:
    $$
    -\sin(\theta_j t)\cos(\theta_j s) + \cos(\theta_j t)\sin(\theta_j s) \\
    = \sin(\theta_j s)\cos(\theta_j t) - \cos(\theta_j s)\sin(\theta_j t) = \sin(\theta_j(s - t))
    $$
4.  **Bottom-right element**:
    $$
    (-\sin(\theta_j t))(-\sin(\theta_j s)) + \cos(\theta_j t)\cos(\theta_j s) \\
    = \cos(\theta_j t)\cos(\theta_j s) + \sin(\theta_j t)\sin(\theta_j s) = \cos(\theta_j(s - t))
    $$

Putting the elements back into the matrix:
$$
\left(R_{\Theta, t}^{(j)}\right)^T R_{\Theta, s}^{(j)} = \begin{bmatrix}
\cos(\theta_j (s - t)) & -\sin(\theta_j (s - t)) \\
\sin(\theta_j (s - t)) & \cos(\theta_j (s - t))
\end{bmatrix} = R_{\Theta, s - t}^{(j)}
$$

Therefore, for the entire $D$-dimensional space:
$$
\left( R_{\Theta, t}^D \right)^T R_{\Theta, s}^D = R_{\Theta, s - t}^D
$$
Substituting this back into the dot product formula:
$$
\tilde{q}_t^T \tilde{k}_s = q_t^T R_{\Theta, s - t}^D k_s
$$
This is an incredibly elegant result! The dot product of the rotated Query and Key vectors depends **only** on their relative distance offset $(s - t)$.

---

### 3.4 Efficient Implementation: The Rotation Formula

Multiplying a $D \times D$ sparse matrix $R_{\Theta, t}^D$ by a vector $x$ takes $O(D^2)$ operations if done naively. However, because $R_{\Theta, t}^D$ is block-diagonal with mostly zeros, we can compute the multiplication much faster.

For a 2D slice of the vector $x = [x_1, x_2]^T$:
$$
\begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix} \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} = \begin{bmatrix} x_1 \cos\theta - x_2 \sin\theta \\ x_1 \sin\theta + x_2 \cos\theta \end{bmatrix}
$$
We can rewrite the right-hand side by grouping the trigonometric terms:
$$
\begin{bmatrix} x_1 \cos\theta - x_2 \sin\theta \\ x_1 \sin\theta + x_2 \cos\theta \end{bmatrix} = \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} \cos\theta + \begin{bmatrix} -x_2 \\ x_1 \end{bmatrix} \sin\theta
$$

Extending this to a $D$-dimensional vector $x$, we define:
$$
\tilde{x} = \begin{bmatrix} -x_2 \\ x_1 \\ -x_4 \\ x_3 \\ \dots \\ -x_D \\ x_{D-1} \end{bmatrix}
$$
Then, the rotation can be computed using element-wise multiplication (Hadamard product $\odot$):
$$
R_{\Theta, t}^D x = x \odot \cos(t\Theta) + \tilde{x} \odot \sin(t\Theta)
$$
where $\cos(t\Theta)$ and $\sin(t\Theta)$ are vectors of shape $[D]$ repeating the corresponding $\cos(\theta_j t)$ and $\sin(\theta_j t)$ values twice. This reduces the computational complexity from $O(D^2)$ to $O(D)$, which is highly efficient.

---

## 4. Key Differences: Vanilla Transformer vs. LLaMA (RoPE)

| Feature | Vanilla Transformer (Sinusoidal PE) | LLaMA (RoPE) |
| :--- | :--- | :--- |
| **Type of Encoding** | Absolute (but possesses relative properties). | Relative (implemented using absolute rotation). |
| **Integration Method** | Vector addition: added directly to the input embeddings. | Multiplicative rotation: applied directly to Q and K inside attention. |
| **Model Architecture** | Added once at the input layer (bottom of the network). | Applied at every Single Multi-Head Attention layer. |
| **Context Length Extension**| Hard to scale; absolute positions are fixed. | Easy to scale using interpolation methods (e.g. YaRN, RoPE scaling). |
| **Long-Range Decay** | No explicit decay built into the encoding. | Naturally decays as relative distance increases, prioritizing local context. |

---

## References

1.  **Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention Is All You Need.** *Advances in Neural Information Processing Systems, 30.*
    *   *Role in this post*: Introduced absolute sinusoidal positional encodings and proposed the hypothesis that sinusoidal functions allow the model to learn relative position relationships via linear transformations.
2.  **Su, J., Lu, Y., Pan, S., Murtadha, A., Wen, B., & Liu, Y. (2021). RoFormer: Enhanced Transformer with Rotary Position Embedding.** *arXiv preprint arXiv:2104.09864.*
    *   *Role in this post*: Proposed RoPE (Rotary Position Embedding), providing the mathematical framework for applying 2D rotation matrices to Query and Key vectors to encode relative position.
3.  **Touvron, H., Martin, L., Stone, K., Albert, P., Almahairi, A., Babaei, Y., Bashlykov, N., Batra, S., Bhargava, P., Bhosale, S., et al. (2023). LLaMA: Open and Efficient Foundation Language Models.** *arXiv preprint arXiv:2302.13971.*
    *   *Role in this post*: Documented LLaMA's architecture, which adopts RoPE as its position encoding mechanism, solidifying RoPE as the standard for modern autoregressive large language models.

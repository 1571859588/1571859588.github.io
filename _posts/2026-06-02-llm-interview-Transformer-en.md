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

This question tests your understanding of the tensor dimensions and data flow as they pass through the Transformer's layers. Let us trace the shape of the tensors step by step, using a simple concrete example to make these abstract dimensions intuitive.

### 2.1 Core Concepts and Notation
To process natural language, we represent text as multi-dimensional tables of numbers, called **tensors**. Let's define the key dimensions:
*   $B$ (**Batch Size**): The number of sentences we process together in one go.
*   $S$ (**Sequence Length** / $seq\_len$): The number of words (or tokens) in a sentence.
*   $D$ (**Hidden / Embedding Dimension**): The size of the list of numbers representing a single word.
*   $V$ (**Vocabulary Size**): The total number of unique words in our dictionary.

---

### 2.2 Step-by-Step Shape Walkthrough with a Numerical Example

Let's build a toy model:
*   **Vocabulary ($V=5$)**: Our dictionary has only 5 words: `["我", "爱", "机", "器", "人"]`.
*   **Embedding Dimension ($D=3$)**: Each word is represented by a list of 3 numbers.
*   **Sequence Length ($S=4$)**: We want to process the sentence `"我爱机器"`, which has 4 tokens.
*   **Batch Size ($B=2$)**: We process 2 sentences at once.

#### Step 1: Input Token Sequence — Shape $[B, S]$
Each word in our sentence is first converted to its position (index) in our dictionary.
*   `"我"` $\rightarrow 0$, `"爱"` $\rightarrow 1$, `"机"` $\rightarrow 2$, `"器"` $\rightarrow 3$.
*   Sentence 1: `[0, 1, 2, 3]`
*   Sentence 2 (e.g. `"爱我机器"`): `[1, 0, 2, 3]`

We stack these two sentences together to form a batch tensor:
$$
X_{\text{token}} = \begin{bmatrix} [0, 1, 2, 3] \\ [1, 0, 2, 3] \end{bmatrix} \quad \text{of shape } [2, 4] \implies [B, S]
$$

#### Step 2: Word Embedding Projection — Shape $[B, S, D]$
We look up each word index in our word embedding lookup matrix $W_e \in \mathbb{R}^{V \times D}$ (which is a table of shape $5 \times 3$):
$$
W_e = \begin{bmatrix}
0.1 & 0.2 & 0.3 \\
0.4 & 0.5 & 0.6 \\
0.7 & 0.8 & 0.9 \\
0.1 & -0.1 & 0.0 \\
0.2 & 0.3 & -0.4
\end{bmatrix}
$$
Replacing the word indices in $X_{\text{token}}$ with their respective 3-dimensional rows from $W_e$ gives:
*   Sentence 1: `[[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9], [0.1, -0.1, 0.0]]` (shape $[4, 3]$)
*   Sentence 2: `[[0.4, 0.5, 0.6], [0.1, 0.2, 0.3], [0.7, 0.8, 0.9], [0.1, -0.1, 0.0]]` (shape $[4, 3]$)

Combined, the batch tensor has shape $[2, 4, 3]$ (corresponding to $[B, S, D]$).

#### Step 3: Multi-Head Attention (MHA) Layers — Shape $[B, h, S, d_k]$
In Multi-Head Attention, we project the embedding tensor into three separate tensors: Query ($Q$), Key ($K$), and Value ($V$) using weight matrices of shape $D \times D$.
To allow the model to focus on different aspects of the text simultaneously, we split the hidden dimension $D$ into $h$ different "heads".
Let's choose $h = 2$ heads.
*   **Head Dimension ($d_k$)**: $d_k = D / h = 3 / 2 = 1.5$ (in practice, we use integers like $D=4096, h=32 \implies d_k=128$. For this example, let's assume we started with $D=8, h=2 \implies d_k=4$).

Let's trace with $D=8, h=2, d_k=4$:
1. **Projection**: We multiply the input $X \in \mathbb{R}^{B \times S \times D}$ by projection matrices $W^Q, W^K, W^V \in \mathbb{R}^{D \times D}$ to get $Q, K, V \in \mathbb{R}^{B \times S \times D}$.
2. **Splitting into Heads**: The dimension $D=8$ is split into 2 heads of size $4$. The tensor shape shifts from $[B, S, D]$ to:
   $$
   [B, S, h, d_k] \xrightarrow{\text{transpose}} [B, h, S, d_k]
   $$
   This shape means we have $B$ batches, each containing $h$ independent attention heads, and each head has a sequence of $S$ tokens represented by a $d_k$-dimensional vector.
3. **Attention Map Computation**: We compute the dot product between queries ($Q$) and keys ($K$) for every pair of words.
   *   $Q$ has shape $[B, h, S, d_k]$.
   *   $K^T$ (transposing the last two dimensions) has shape $[B, h, d_k, S]$.
   *   Multiplying them:
       $$
       [B, h, S, d_k] \times [B, h, d_k, S] \rightarrow [B, h, S, S]
       $$
       The resulting $[B, h, S, S]$ tensor represents the "importance score" (attention map) between every pair of words in the sequence. For instance, the element at index $(b, head, i, j)$ tells us how much the $i$-th word pays attention to the $j$-th word.
4. **Applying Attention to Values**: We weight the Value tensor ($V$) by these attention scores:
   $$
   \text{Attention Map} \times V \implies [B, h, S, S] \times [B, h, S, d_k] \rightarrow [B, h, S, d_k]
   $$
5. **Concatenation**: We merge all $h$ heads back together by concatenating them along the head dimension:
   $$
   \text{Transpose: } [B, h, S, d_k] \rightarrow [B, S, h, d_k] \xrightarrow{\text{Reshape: }} [B, S, h \times d_k] \implies [B, S, D]
   $$
   Finally, we multiply by an output projection matrix $W^O \in \mathbb{R}^{D \times D}$, maintaining the shape $[B, S, D]$.

Because the attention layer only linearly combines and projects features, the sequence length $S$ and the embedding dimension $D$ are perfectly preserved.

---

## 3. Why Scale Attention Dot-Products by $\sqrt{d_k}$?

In the attention formula:
$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$
why do we divide by $\sqrt{d_k}$? Let's break down the probability and calculus concepts step-by-step to see why this division is critical.

### 3.1 What are Mean and Variance? (High School Primer)
*   **Random Variable**: A variable whose value depends on outcomes of a random phenomenon.
*   **Mean / Expected Value ($\mathbb{E}[X]$)**: The average value of a random variable over many trials.
*   **Variance ($\text{Var}(X)$)**: A measure of how far the values are spread out from their average.
    *   If $\text{Var}(X) = 0$, all values are exactly equal to the mean.
    *   If $\text{Var}(X)$ is large, the values can be extremely high or extremely low.
*   **Key Properties of Variance**:
    1. **Scale Rule**: If you multiply a random variable by a constant number $a$, the variance is scaled by $a^2$:
       $$
       \text{Var}(aX) = a^2 \text{Var}(X)
       $$
    2. **Sum Rule**: If two random variables $X$ and $Y$ are independent (they don't affect each other), the variance of their sum is the sum of their variances:
       $$
       \text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y)
       $$
    3. **Product Rule for Independent Zero-Mean Variables**: If $X$ and $Y$ are independent and both have a mean of $0$, then:
       $$
       \text{Var}(XY) = \text{Var}(X) \cdot \text{Var}(Y)
       $$

---

### 3.2 Step-by-Step Derivation of Dot Product Variance

Let's calculate the dot product of a single Query vector $q$ and a single Key vector $k$. Both are of dimension $d_k$:
$$
q = [q_1, q_2, \dots, q_{d_k}], \quad k = [k_1, k_2, \dots, k_{d_k}]
$$
The dot product $q \cdot k$ is:
$$
q \cdot k = \sum_{i=1}^{d_k} q_i k_i = q_1 k_1 + q_2 k_2 + \dots + q_{d_k} k_{d_k}
$$

Let's assume that each element $q_i$ and $k_i$ is randomly initialized such that:
*   $\mathbb{E}[q_i] = \mathbb{E}[k_i] = 0$ (mean is 0)
*   $\text{Var}(q_i) = \text{Var}(k_i) = 1$ (variance is 1)
*   All $q_i$ and $k_j$ are independent of one another.

#### Step A: Variance of a single term $q_i k_i$
Since $q_i$ and $k_i$ are independent and have mean 0, we apply the Product Rule:
$$
\text{Var}(q_i k_i) = \text{Var}(q_i) \cdot \text{Var}(k_i) = 1 \cdot 1 = 1
$$

#### Step B: Variance of the sum of $d_k$ terms
Since all terms $q_i k_i$ are independent, we apply the Sum Rule:
$$
\text{Var}(q \cdot k) = \text{Var}\left(\sum_{i=1}^{d_k} q_i k_i\right) = \sum_{i=1}^{d_k} \text{Var}(q_i k_i) = \underbrace{1 + 1 + \dots + 1}_{d_k \text{ times}} = d_k
$$
This means that the variance of the dot product is exactly equal to the dimension $d_k$. As the dimension $d_k$ grows (e.g., $d_k = 128$), the variance of the dot product becomes very large ($128$).

#### Step C: Scaling the variance back to 1
If we divide the dot product by $\sqrt{d_k}$, we can apply the Scale Rule (with $a = 1/\sqrt{d_k}$):
$$
\text{Var}\left(\frac{q \cdot k}{\sqrt{d_k}}\right) = \left(\frac{1}{\sqrt{d_k}}\right)^2 \text{Var}(q \cdot k) = \frac{1}{d_k} \cdot d_k = 1
$$
By dividing by $\sqrt{d_k}$, we guarantee that the variance of the inputs to the Softmax function is always $1$, regardless of how large the head dimension $d_k$ becomes.

---

### 3.3 Why Large Variance Causes Gradient Vanishing in Softmax

Let's understand why a large variance is harmful to training. The Softmax function turns raw numbers (logits) into probabilities:
$$
\text{softmax}(z)_i = \frac{e^{z_i}}{\sum_{j} e^{z_j}}
$$

#### Concrete Numerical Example
Imagine we have 3 words, and we compute their attention logits $z$.

*   **Case A: Small Variance (Scaled, e.g., $z = [-1, 0, 1]$)**
    $$
    \text{softmax}([-1, 0, 1]) = \left[ \frac{e^{-1}}{e^{-1} + e^0 + e^1}, \frac{e^0}{e^{-1} + e^0 + e^1}, \frac{e^1}{e^{-1} + e^0 + e^1} \right] \approx [0.09, 0.24, 0.67]
    $$
    Here, the probabilities are spread out smoothly. If the inputs change slightly, the probabilities change smoothly. Gradients will flow well.

*   **Case B: Large Variance (Unscaled, e.g., $z = [-10, 0, 10]$)**
    $$
    e^{-10} \approx 0.000045, \quad e^0 = 1, \quad e^{10} \approx 22026
    $$
    $$
    \text{softmax}([-10, 0, 10]) \approx \left[ \frac{0.000045}{22027}, \frac{1}{22027}, \frac{22026}{22027} \right] \approx [0.000000002, 0.000045, 0.999955]
    $$
    The probability distribution becomes extremely "sharp", almost identical to a one-hot vector $[0, 0, 1]$.

#### The Gradient Problem
The derivative (gradient) of Softmax with respect to its input $z_j$ is given by:
$$
\frac{\partial \text{softmax}(z)_i}{\partial z_j} = \text{softmax}(z)_i \cdot (\delta_{ij} - \text{softmax}(z)_j)
$$
Where $\delta_{ij} = 1$ if $i=j$, and $0$ otherwise.
*   In **Case B**, the values of $\text{softmax}(z)_i$ are either extremely close to $0$ (for $i=1,2$) or extremely close to $1$ (for $i=3$).
*   If $\text{softmax}(z)_i \approx 0$, then the product $\text{softmax}(z)_i \cdot (\dots) \approx 0$.
*   If $\text{softmax}(z)_i \approx 1$, then $(1 - \text{softmax}(z)_i) \approx 0$, so the gradient is also $\approx 0$.
*   This means the gradient completely vanishes, stopping the neural network from learning.

By scaling by $1/\sqrt{d_k}$, we keep the inputs in the active, responsive region of Softmax.

---

### 3.4 Embedding Scaling by $\sqrt{D}$

In the original Transformer, the output of the embedding layer is multiplied by $\sqrt{D}$ before adding positional encodings:
$$
X_{\text{final}} = X_{\text{embedding}} \times \sqrt{D} + PE
$$

Let's understand why this is necessary:

#### 1. Variance Calibration (Xavier Initialization)
When we initialize the embedding lookup matrix, we use Xavier initialization to ensure training stability. Under Xavier, the weights are initialized with a variance of $1/D$.
*   This means the elements of our word embeddings $X_{\text{embedding}}$ start with a variance of $\text{Var}(X_{ij}) \approx 1/D$.
*   If $D=4096$, the variance is $1/4096 \approx 0.00024$. The numbers are very small.
*   By multiplying the embedding tensor by $\sqrt{D}$, we scale the variance of its elements back to $1.0$:
    $$
    \text{Var}(\sqrt{D} \cdot X_{ij}) = (\sqrt{D})^2 \text{Var}(X_{ij}) = D \cdot \frac{1}{D} = 1
    $$

#### 2. Signal Preservation
Positional encodings ($PE$) consist of sine and cosine values, which naturally vary between $[-1, 1]$. The average variance of these values is about $0.5$.
*   Without scaling, the embedding values (with variance $1/D \approx 0.00024$) would have an average magnitude of about $\sqrt{1/4096} \approx 0.015$.
*   If we directly add the positional encoding (values around $\pm 1.0$) to the embedding (values around $\pm 0.015$), the positional encoding will be nearly **70 times larger** than the word embedding!
*   The semantic word information would be completely drowned out by the positional information.
*   Multiplying the embedding by $\sqrt{D}$ scales its values to have an average magnitude of $\approx 1.0$, allowing the semantic signal and the positional signal to be combined at a balanced $1:1$ ratio.

---

## 4. Layer Normalization: Which Dimension is Normalized?

Layer Normalization (LN) stabilizes the activations in deep networks. To understand how it works and which dimension it normalizes, we compare it with Batch Normalization (BN) using a concrete numerical example.

### 4.1 Concept and Formulas
For a single word/token vector $x \in \mathbb{R}^D$ (representing one token in one sentence):
1. **Compute Mean**:
   $$
   \mu = \frac{1}{D} \sum_{i=1}^D x_i
   $$
2. **Compute Variance**:
   $$
   \sigma^2 = \frac{1}{D} \sum_{i=1}^D (x_i - \mu)^2
   $$
3. **Normalize**:
   $$
   \hat{x}_i = \frac{x_i - \mu}{\sqrt{\sigma^2 + \epsilon}} \quad (\epsilon \text{ is a tiny number to prevent division by zero})
   $$
4. **Scale and Shift**:
   $$
   y_i = \gamma_i \hat{x}_i + \beta_i
   $$
   where $\gamma, \beta \in \mathbb{R}^D$ are learnable parameters that let the model adapt the normalized values.

---

### 4.2 Numerical Comparison: LayerNorm vs BatchNorm

Let's construct a small tensor of shape $[B=2, S=2, D=3]$ (Batch size 2, Sequence length 2, Hidden dimension 3):

*   **Batch 1 (Sentence 1)**:
    *   Token 1 (`"I"`): $x_{1,1} = [1.0, 2.0, 3.0]$
    *   Token 2 (`"love"`): $x_{1,2} = [2.0, 4.0, 6.0]$
*   **Batch 2 (Sentence 2)**:
    *   Token 1 (`"You"`): $x_{2,1} = [1.0, -1.0, 0.0]$
    *   Token 2 (`"too"`): $x_{2,2} = [-2.0, 0.0, 2.0]$

#### Case 1: Layer Normalization (LN)
LN works **horizontally** (across the features dimension $D$) on each token vector independently.

Let's normalize Batch 1, Token 1 ($x_{1,1} = [1.0, 2.0, 3.0]$):
1. **Mean**: $\mu = \frac{1.0 + 2.0 + 3.0}{3} = 2.0$
2. **Variance**: $\sigma^2 = \frac{(1.0-2.0)^2 + (2.0-2.0)^2 + (3.0-2.0)^2}{3} = \frac{1.0 + 0.0 + 1.0}{3} = \frac{2}{3} \approx 0.667$
3. **Standard Deviation**: $\sigma = \sqrt{0.667} \approx 0.816$
4. **Normalized Token**:
   $$
   \hat{x}_{1,1} = \left[ \frac{1.0 - 2.0}{0.816}, \frac{2.0 - 2.0}{0.816}, \frac{3.0 - 2.0}{0.816} \right] \approx [-1.22, 0.0, 1.22]
   $$

Notice that this calculation **only used the numbers inside this single token**. What happens to other tokens or sentences does not affect it.

#### Case 2: Batch Normalization (BN)
BN works **vertically** (across the batch dimension $B$ and sequence dimension $S$) for each feature index independently.

Let's normalize the first feature index ($d=0$) of our tensor. The values for $d=0$ across all batches and tokens are:
$$
[1.0 \ (\text{from } x_{1,1}), \ 2.0 \ (\text{from } x_{1,2}), \ 1.0 \ (\text{from } x_{2,1}), \ -2.0 \ (\text{from } x_{2,2})]
$$
1. **Mean**: $\mu = \frac{1.0 + 2.0 + 1.0 + (-2.0)}{4} = 0.5$
2. **Variance**: $\sigma^2 = \frac{(1-0.5)^2 + (2-0.5)^2 + (1-0.5)^2 + (-2-0.5)^2}{4} = \frac{0.25 + 2.25 + 0.25 + 6.25}{4} = 2.25$
3. **Standard Deviation**: $\sigma = \sqrt{2.25} = 1.5$
4. **Normalized values for $d=0$**:
   *   For $x_{1,1}$: $\hat{x}_{1,1}[0] = \frac{1.0 - 0.5}{1.5} \approx 0.33$
   *   For $x_{1,2}$: $\hat{x}_{1,2}[0] = \frac{2.0 - 0.5}{1.5} = 1.0$
   *   For $x_{2,1}$: $\hat{x}_{2,1}[0] = \frac{1.0 - 0.5}{1.5} \approx 0.33$
   *   For $x_{2,2}$: $\hat{x}_{2,2}[0] = \frac{-2.0 - 0.5}{1.5} \approx -1.67$

---

### 4.3 Why is LayerNorm Preferred in NLP/Transformers?

1. **Handling Variable Sequence Lengths**:
   In NLP, different sentences have different lengths. If we use BN, padding tokens (which are added to make sentences the same length in a batch) will skew the mean and variance calculations of other real tokens, introducing noise. Since LN is computed per token, it is completely unaffected by padding.
2. **Batch Size Independence**:
   BN requires a sufficiently large batch size to calculate stable means and variances. During generation (inference), we often generate text one sentence at a time (batch size = 1), which makes BN unstable. LN works exactly the same way during training and inference, regardless of the batch size.
3. **Parameter Matching**:
   Since LN normalizes along the hidden dimension $D$, its learnable scaling parameters $\gamma$ and shift parameters $\beta$ are of shape $[D]$. This perfectly matches the embedding representation of each token.

---

## References

1. **Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention Is All You Need.** *Advances in Neural Information Processing Systems, 30.*
   - *Role in this post*: The foundational paper introducing the Transformer architecture, scaled dot-product attention, multi-head attention, and the overall encoder-decoder framework. It provides the core mathematical justification for scaling by $1/\sqrt{d_k}$ and multiplying embeddings by $\sqrt{d_{\text{model}}}$.
2. **Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). Layer Normalization.** *arXiv preprint arXiv:1607.06450.*
   - *Role in this post*: The paper that proposed Layer Normalization as an alternative to Batch Normalization. It explains the mathematical formulation of LN and why it is well-suited for recurrent architectures and sequence-to-sequence learning tasks.
3. **Glorot, X., & Bengio, Y. (2010). Understanding the difficulty of training deep feedforward neural networks.** *Proceedings of the Thirteenth International Conference on Artificial Intelligence and Statistics.*
   - *Role in this post*: Introduced "Xavier initialization" (Glorot initialization). It provides the mathematical context for why embedding matrices initialized with variance $1/D$ require scaling by $\sqrt{D}$ to restore variance to 1.
---
title: "Why Do Transformers Use Layer Normalization? Deep Dive into Normalization Mechanics"
date: 2026-06-07
permalink: /posts/2026/06/llm-interview-layernorm-en/
categories:
  - LLM Interview
tags:
  - Layer Normalization
  - Batch Normalization
  - RMSNorm
  - Transformer Architecture
  - Interview Preparation
toc: true
---

A classic and highly frequent question in large language model (LLM) algorithm interviews (such as Kuaishou's Kuaistar program, ByteDance, and Alibaba) is: **"Why do Transformers use Layer Normalization (LN) instead of Batch Normalization (BN)?"**

While most candidates can list a few high-level reasons, few can provide a comprehensive explanation covering data distribution, mathematical stability, and optimization landscapes. Furthermore, interviewers often follow up with questions about newer alternatives like RMSNorm or why BN is preferred in Convolutional Neural Networks (CNNs) like ResNet.

This post will dissect this question step-by-step. We will break down the mathematical formulations, provide proofs, and explain the underlying principles in a way that is accessible to readers with a high school level of mathematics.

---

## 1. The Four Common Normalization Methods

To understand why Layer Normalization is preferred, we must first compare it to other normalization techniques. In deep learning, there are four classic normalization methods:
1.  **Batch Normalization (BN)**
2.  **Layer Normalization (LN)**
3.  **Instance Normalization (IN)**
4.  **Group Normalization (GN)**

These methods differ in the dimensions over which they compute the mean and variance.

> *Placeholder: [Refer to Figure 1: Comparison of normalization methods (Source: Wu & He, 2018). Each image shows a feature map tensor, where N is the batch axis, C is the channel axis, and H, W are the spatial axes (height and width). The pixels in blue are normalized by the same mean and variance.]*

### 1.1 Dimensional Comparisons
Let's define a tensor representing a batch of data:
*   $N$: Batch size (number of samples/sentences).
*   $C$: Channels / Hidden Dimension ($D$).
*   $H, W$: Spatial dimensions (Height and Width for images, or Sequence Length $S$ for text).

*   **Batch Normalization (BN)**: Normalizes across the batch dimension $N$ and spatial dimensions $H, W$ for each channel $C$ separately.
*   **Layer Normalization (LN)**: Normalizes across the channel dimension $C$ and spatial dimensions (for NLP, usually just the channel/feature dimension $D$) for each sample/token individually.
*   **Instance Normalization (IN)**: Normalizes across the spatial dimensions $H, W$ for each channel and sample independently (commonly used in image style transfer).
*   **Group Normalization (GN)**: Groups channels into smaller sub-groups, and normalizes within each group for each sample independently.

---

## 2. Why Transformers Use Layer Normalization (Three Core Reasons)

There are three primary reasons why Layer Normalization is integral to the success of deep Transformer models:

### 2.1 Ensuring Training Stability (Gradient Flow)
In deep neural networks, activations are repeatedly multiplied by weight matrices:
$$
h_L = W_L \cdot \sigma(W_{L-1} \dots \sigma(W_1 x))
$$
*   If the weights are slightly too large, the activations can grow exponentially with depth $L$, leading to **gradient explosion**.
*   If the weights are slightly too small, the activations decay to zero, leading to **gradient vanishing**.
*   When gradients explode or vanish, training becomes unstable, and the loss function can output `NaN` (Not a Number).

Layer Normalization resolves this by standardizing the activations at the output of each sub-layer to have a mean of $0$ and a variance of $1$:
$$
\hat{x}_i = \frac{x_i - \mu}{\sqrt{\sigma^2 + \epsilon}}
$$
This constrains the magnitude of the vectors, ensuring stable forward activations and healthy backward gradient flow.

---

### 2.2 Accelerating Model Convergence (Optimization Landscape)
Normalizing features shifts the optimization landscape of the model, making it much easier to train.

#### 1. Preventing Activation Saturation
Without normalization, activation values can drift into the "saturation regions" (dead areas) of non-linear activation functions (e.g., GeLU or SwiGLU). In these regions, the derivative of the activation function approaches $0$, halting learning. Standardizing the features keeps the inputs in the active, responsive region.

#### 2. Smoothing the Loss Contour: The Ellipse vs. Circle Example
Imagine we are finding the lowest point in a valley (minimizing the loss function).
*   **Case A: Unnormalized Features (Narrow Ellipse Contour)**
    If features have very different scales, the loss contour lines form a long, narrow ellipse. If you perform gradient descent here, the steps will oscillate wildly back and forth across the steep walls of the valley, making very slow progress toward the minimum point.
*   **Case B: Normalized Features (Spherical/Circular Contour)**
    Normalization scales the features equally, transforming the narrow ellipse into a neat circle. In a circular contour, the gradient direction points directly toward the minimum point. This allows the model to use larger learning rates and converge much faster.

---

### 2.3 Reducing Sensitivity to Weight Initialization (Scale Invariance Proof)

In early deep learning, training was highly sensitive to how weights were initialized (e.g., requiring precise Xavier or He initializations). Layer Normalization exhibits **scale invariance**, which mathematically reduces this sensitivity.

#### Mathematical Proof of Scale Invariance
Suppose we multiply the weight matrix $W$ of a linear layer by a constant scalar factor $k$ (where $k > 0$), resulting in $W' = k W$.
Let's see what happens to the output of the layer $y = W x$ under Layer Normalization.

1.  **Modified Output**:
    $$
    y'_i = (W'x)_i = (kWx)_i = k y_i
    $$
2.  **Modified Mean**:
    $$
    \mu(y') = \frac{1}{D} \sum_{i=1}^D y'_i = \frac{1}{D} \sum_{i=1}^D (k y_i) = k \left( \frac{1}{D} \sum_{i=1}^D y_i \right) = k \mu(y)
    $$
3.  **Modified Variance**:
    $$
    \begin{aligned}
    \sigma^2(y') &= \frac{1}{D} \sum_{i=1}^D \left( y'_i - \mu(y') \right)^2 \\
    &= \frac{1}{D} \sum_{i=1}^D \left( k y_i - k \mu(y) \right)^2 \\
    &= \frac{1}{D} \sum_{i=1}^D k^2 \left( y_i - \mu(y) \right)^2 \\
    &= k^2 \sigma^2(y)
    \end{aligned}
    $$
    Therefore, the standard deviation is:
    $$
    \sigma(y') = \sqrt{k^2 \sigma^2(y)} = k \sigma(y)
    $$
4.  **Applying Layer Normalization**:
    $$
    \text{LN}(y')_i = \frac{y'_i - \mu(y')}{\sigma(y')} = \frac{k y_i - k \mu(y)}{k \sigma(y)} = \frac{k(y_i - \mu(y))}{k \sigma(y)} = \frac{y_i - \mu(y)}{\sigma(y)} = \text{LN}(y)_i
    $$

This mathematically proves that multiplying the weights by any scalar $k$ does not change the normalized output. Thus, even if the weight initialization scale is off, Layer Normalization naturally buffers and standardizes the activations, making training highly robust.

---

## 3. Interview Follow-Ups: Consecutive Questions

In a real interview, this question is often followed by deeper inquiries. Let's explore how to answer them.

### 3.1 Why Not Use Batch Normalization (BN) in Transformers?

There are two primary reasons why Batch Normalization fails in NLP and Transformer architectures:

#### 1. The Variable-Length Padding Problem
In NLP, sentences in a batch have different lengths. To process them together, we pad shorter sentences with zeros (padding tokens).
*   **Batch Normalization** computes statistics (mean and variance) vertically across the entire batch. The dummy padding tokens distort the batch statistics, polluting the mean and variance calculations for real words.
*   **Layer Normalization** computes statistics horizontally within each token vector individually. It is completely independent of other tokens or sentences, making it immune to padding artifacts.

#### Concrete Numerical Example
Consider a batch of size $B=2$, sequence length $S=2$, and hidden dimension $D=2$.
*   Sentence 1: `[[1.0, 2.0], [0.0, 0.0]]` (Second token is padding).
*   Sentence 2: `[[3.0, 4.0], [5.0, 6.0]]` (No padding).

If we use BN to normalize the first channel ($d=0$) across the batch and sequence (4 values: `[1.0, 0.0, 3.0, 5.0]`):
*   Mean: $\mu = \frac{1+0+3+5}{4} = 2.25$.
*   Notice how the padding value `0.0` pulled the mean down from $3.0$ (mean of real inputs `1, 3, 5`) to $2.25$. This introduces artificial noise to the real token embeddings.

#### 2. Batch Size Independence at Inference
During autoregressive generation (inference), we generate text token-by-token, often with a batch size of $1$.
*   **BN** requires batch statistics. If the batch size is $1$ during inference, the calculated mean and variance will fluctuate wildly compared to the statistics accumulated during training (where batch sizes were large). This causes a training-inference mismatch.
*   **LN** behaves identically regardless of batch size or sequence length, ensuring stable and consistent performance.

---

### 3.2 What is the Difference Between LayerNorm and RMSNorm?

**RMSNorm (Root Mean Square Normalization)** (Zhang & Sennrich, 2019) is a modern, faster alternative to LayerNorm used in models like LLaMA and Gemma.

#### 1. Formulations
*   **LayerNorm**: Normalizes using both mean ($\mu$) and variance ($\sigma^2$):
    $$
    \hat{x}_i = \frac{x_i - \mu}{\sqrt{\sigma^2 + \epsilon}}
    $$
*   **RMSNorm**: Hypothesizes that the mean shifting ($\mu$) is unnecessary. It only scales by the Root Mean Square (RMS):
    $$
    \text{RMS}(x) = \sqrt{\frac{1}{D} \sum_{i=1}^D x_i^2}
    $$
    $$
    \hat{x}_i = \frac{x_i}{\text{RMS}(x)}
    $$

#### 2. Why Use RMSNorm?
*   **Computational Efficiency**: By avoiding the mean computation ($\mu$), RMSNorm reduces the number of operations. It saves about $7\%$--$10\%$ of the computation time in the normalization layers.
*   **Comparable Performance**: Empirical studies show that RMSNorm achieves virtually identical convergence speed and downstream task accuracy as standard LayerNorm.

---

### 3.3 How Does LayerNorm Perform in Convolutional Networks (e.g., ResNet)?

Historically, Batch Normalization is much better than LayerNorm in CNNs. Why?

#### 1. Spatial Consistency in Images
In images, neighboring pixels are highly correlated (they represent similar features, like a patch of color or an edge).
*   **BN** computes mean and variance for each channel across all pixels and batches. This preserves the relative differences in activation levels across different pixels.
*   **LN** normalizes all channels at each individual pixel. This squashes the channel-wise differences at each pixel, destroying the spatial structure and reducing the CNN's capacity to extract spatial hierarchies.

#### 2. Modern Vision Transformers (ViT)
Interestingly, in modern **Vision Transformers (ViTs)** and hybrid networks like ConvNeXt, LayerNorm is used instead of BN. This is because ViTs process images as sequences of patches (treating them like tokens in a sentence), making LN highly effective.

---

## References

1.  **Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). Layer Normalization.** *arXiv preprint arXiv:1607.06450.*
    *   *Role in this post*: The seminal paper that proposed Layer Normalization, explaining its mathematical formulation and demonstrating its effectiveness in stabilizing sequence models.
2.  **Wu, Y., & He, K. (2018). Group Normalization.** *Proceedings of the European Conference on Computer Vision (ECCV).*
    *   *Role in this post*: Introduced Group Normalization and provided the classic visualization comparing BN, LN, IN, and GN across batch and channel axes.
3.  **Zhang, B., & Sennrich, R. (2019). Root Mean Square Layer Normalization.** *Advances in Neural Information Processing Systems, 32.*
    *   *Role in this post*: Proposed RMSNorm, proving that scaling by the root mean square of activations is sufficient to stabilize training while saving compute.
4.  **Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention Is All You Need.** *Advances in Neural Information Processing Systems, 30.*
    *   *Role in this post*: The foundational paper of the Transformer architecture, which popularized the use of Layer Normalization in sequence-to-sequence neural networks.

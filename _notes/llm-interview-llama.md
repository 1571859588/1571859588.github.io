---
layout: notes
title: "LLaMA 架构与 RoPE 位置编码"
series: llm-interview
series_order: 2
date: 2025-06-06
---

## 1. LLaMA 与 Transformer 的差异

LLaMA 基于 Transformer Decoder，但做了以下关键改进：

| 组件 | 原始 Transformer | LLaMA |
|------|-----------------|-------|
| 归一化位置 | Post-LayerNorm | **Pre-LayerNorm** |
| 归一化类型 | LayerNorm | **RMSNorm** |
| 激活函数 | ReLU | **SwiGLU** |
| 位置编码 | 正弦编码 | **RoPE** |

## 2. Pre-LayerNorm

原始 Transformer 在每个子层**之后**做归一化：

\[
\text{Post-LN: } x_{l+1} = \text{LayerNorm}(x_l + F(x_l))
\]

LLaMA 改为在**之前**做归一化：

\[
\text{Pre-LN: } x_{l+1} = x_l + F(\text{RMSNorm}(x_l))
\]

### 2.1 为什么 Pre-LN 更好？

- **训练更稳定**：梯度直接从残差路径传播到浅层
- **不需要 warmup**：Post-LN 需要 learning rate warmup，Pre-LN 不需要
- **深层扩展**：Pre-LN 在大模型（100+ 层）中表现更好

## 3. RMSNorm

传统 LayerNorm：

\[
\text{LayerNorm}(x) = \frac{x - \mu}{\sigma} \cdot \gamma + \beta
\]

RMSNorm 去掉了均值的中心化：

\[
\text{RMSNorm}(x) = \frac{x}{\sqrt{\frac{1}{d}\sum_{i=1}^d x_i^2 + \epsilon}} \cdot \gamma
\]

### 3.1 RMSNorm 的优势

- **更快**：少了均值计算，约快 10-15%
- **效果相当**：实验表明去掉中心化几乎不影响性能
- **更简单**：不学习 $\beta$ 参数

## 4. SwiGLU 激活

传统 FFN：

\[
\text{FFN}(x) = \text{ReLU}(xW_1)W_2
\]

SwiGLU 使用门控机制：

\[
\text{SwiGLU}(x) = (\text{Swish}(xW_1) \odot xW_2)W_3
\]

其中 $\text{Swish}(x) = x \cdot \sigma(x)$（$\sigma$ 为 sigmoid）。

### 4.1 为什么用 SwiGLU？

- 基于门控线性单元 (GLU) 的变体
- 实验证明在语言建模任务上优于 ReLU、GELU
- 额外的门控路径允许更复杂的非线性变换

## 5. RoPE 位置编码

RoPE 通过**旋转变换**对 query 和 key 注入相对位置信息：

\[
f(q, m) = q e^{im\theta}
\]

在二维情形下：

\[
\begin{pmatrix}
q_0' \\ q_1'
\end{pmatrix} =
\begin{pmatrix}
\cos m\theta & -\sin m\theta \\
\sin m\theta & \cos m\theta
\end{pmatrix}
\begin{pmatrix}
q_0 \\ q_1
\end{pmatrix}
\]

### 5.1 RoPE 的关键性质

- **相对位置**：$q_m^T k_n$ 只依赖于 $(m - n)$
- **远程衰减**：随着距离增加，注意力自然衰减
- **外推友好**：可以通过调整 $\theta$ 支持更长序列

## 6. KV Cache

自回归生成时，每步都要重新计算所有历史 token 的 K 和 V。KV Cache 将已计算的 K 和 V 缓存起来：

```python
# 推理时
q_new = W_Q @ x_new
k_new = W_K @ x_new  
v_new = W_V @ x_new

# 拼接历史
k = concat([k_cache, k_new])
v = concat([v_cache, v_new])

# 计算 attention
attn = softmax(q_new @ k.T / sqrt(d_k)) @ v
```

## 7. GQA（Grouped-Query Attention）

MHA 中每个头有独立的 K、V。GQA 将 Q 头分组，每组共享 K、V：

- **MHA**：$h_q = h_k = h_v$
- **GQA**：$h_q > h_k = h_v$，$h_q / h_k = g$ 组
- **MQA**：$h_k = h_v = 1$（GQA 的极端情况）

GQA 在推理速度和模型质量之间取得了平衡。

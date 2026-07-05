---
layout: notes
title: "LLM 推理优化技术"
series: llm-interview
series_order: 6
date: 2025-06-20
---

## 1. LLM 推理的两阶段

LLM 自回归生成分为两个阶段：

| 阶段 | 瓶颈 | 特点 |
|------|------|------|
| **Prefill** | 计算密集型 | 一次性处理全部 prompt tokens，GPU 利用率高 |
| **Decode** | 显存带宽密集型 | 逐个生成 token，每次只算一个，大量时间读 KV Cache |

解码阶段的公式：

```
每个 decode step:
  Q: [1, d_model]       ← 只有当前 token
  K: [n_past+1, d_model] ← 所有历史 token
  V: [n_past+1, d_model] ← 所有历史 token
```

## 2. KV Cache 详解

### 2.1 为什么需要 KV Cache？

自回归生成中，前一步计算的 K、V 在后续步骤中不变，缓存可避免重复计算：

```
Step 1: 计算并缓存 K[0], V[0]
Step 2: 计算 K[1], V[1]，使用 K[0:1], V[0:1] 计算 attention
Step 3: 计算 K[2], V[2]，使用 K[0:2], V[0:2] 计算 attention
...
```

### 2.2 显存估算

对于 LLaMA-7B（32层，$d_{model}=4096$，$h=32$）：

```
每个 token 的 KV Cache:
  sizeof(fp16) × n_layers × d_model × 2(K+V) = 2 × 32 × 4096 × 2 = 512 KB

序列长度 2048 → 512 KB × 2048 = 1 GB (批大小=1)
序列长度 2048, 批大小=32 → 1 GB × 32 = 32 GB
```

## 3. 量化

### 3.1 训练后量化 (PTQ)

将 FP16 权重转为低位宽整数，减少显存和加速计算：

| 精度 | 大小比 | 质量影响 |
|------|--------|----------|
| FP32 | 1× | 基准 |
| FP16 | 0.5× | 无损 |
| INT8 | 0.25× | 几乎无损 |
| INT4 | 0.125× | 轻微退化 |
| NF4 | 0.125× | QLoRA 用 |

### 3.2 GPTQ

基于 Optimal Brain Surgeon 的逐层量化方法：

```
对每一层：
  1. 收集校准数据的激活统计
  2. 按重要性排序权重（基于 Hessian 对角）
  3. 逐列量化，每个权重量化后补偿剩余权重
```

关键性质：
- 数据依赖（需要校准数据）
- 执行时间较长（需要数小时）
- 质量优于简单的 RTN（Round-To-Nearest）

### 3.3 AWQ

Activation-Aware Weight Quantization：观察到权重的重要性与对应激活幅度相关：

\[
s_i = \text{mean}(|X_i|)^{\alpha}, \quad \alpha \approx 0.5
\]

对重要通道使用**更大缩放因子**，等效于量化误差更小。不需要反向传播，速度快。

### 3.4 GGUF / llama.cpp

面向 CPU 推理的量化格式：

```bash
# 常用量化级别
q4_0   → 4-bit, 质量可接受
q4_K_M → 4-bit, 推荐（平衡质量与速度）
q5_K_M → 5-bit, 质量更好
q8_0   → 8-bit, 接近无损
```

## 4. 投机解码 (Speculative Decoding)

用**小模型快速生成候选**，用大模型**并行验证**：

```
每轮：
  1. Draft Model (小模型, 快) 生成 K 个候选 token
  2. Target Model (大模型, 慢) 并行验证这 K 个 token
  3. 接受一致的 token，从第一个不一致处截断
  4. 重复
```

### 4.1 加速分析

期望加速比：

\[
\text{speedup} = \frac{\text{小模型生成} + \text{大模型验证}}{\text{大模型逐 token 生成}}
\]

典型加速 2-3×，接受率越高加速越明显。

## 5. Continuous Batching

传统静态批处理必须等所有请求完成才能释放显存。Continuous Batching 允许动态增删：

```
Batch(t):  [请求A] [请求B] [请求C]
Batch(t+1): [请求A] [请求D] [请求C]  ← B 完成，D 加入
Batch(t+2): [请求E] [请求D] [请求C]  ← A 完成，E 加入
```

### 5.1 吞吐量提升

- 静态批处理利用率：40-60%
- Continuous Batching 利用率：80-95%
- vLLM、TGI、TensorRT-LLM 都支持

## 6. 推理框架对比

| 框架 | 特点 | 适用场景 |
|------|------|----------|
| vLLM | PagedAttention, 高吞吐 | 在线服务 |
| TGI (HuggingFace) | 生态好, 易部署 | 快速原型 |
| TensorRT-LLM | NVIDIA 优化最极致 | 高性能部署 |
| llama.cpp | CPU 推理, GGUF | 本地/边缘 |
| Ollama | 封装 llama.cpp, 好用 | 本地使用 |
| SGLang | RadixAttention, 结构化 | 复杂应用 |

## 7. 面试速记

- 两阶段：Prefill（计算密集）vs Decode（带宽密集）
- KV Cache 是推理显存的主要消耗（随长度线性增长）
- 量化（GPTQ/AWQ/GGUF）牺牲少量质量换显存
- 投机解码用小模型"猜"，大模型"验证"
- Continuous Batching 是服务吞吐的关键优化
- Paged Attention 解决 KV Cache 碎片化

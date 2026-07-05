---
layout: notes
title: "Mixture-of-Experts (MoE) 架构"
series: llm-interview
series_order: 5
date: 2025-06-15
---

## 1. MoE 基本概念

MoE 的核心思想：用多个**专家网络**替代单个 FFN 层，通过**路由器**为每个 token 选择最合适的专家：

```
传统 FFN:
  x → FFN → y

MoE FFN:
  x → ┌─ Expert 1 ─┐
       ├─ Expert 2 ─┤ → 加权求和 → y
       ├─ Expert 3 ─┤
       └─ Expert 4 ─┘
        ↑ Router(gate)
```

## 2. 数学表达

对于输入 $x$，MoE 层的输出为：

\[
y = \sum_{i=1}^{N} G(x)_i \cdot E_i(x)
\]

其中：
- $N$：专家总数
- $E_i$：第 $i$ 个专家（通常是标准 FFN）
- $G$：路由器/门控网络

### 2.1 Top-K 路由

实际使用中，每个 token 只激活 **Top-K** 个专家（通常 K = 1 或 2）：

\[
G(x) = \text{softmax}(\text{TopK}(x \cdot W_g, k))
\]

其中 $\text{TopK}$ 保留最大的 $k$ 个值，其余置为 $-\infty$（softmax 后为 0）。

## 3. 负载均衡

MoE 的核心挑战：部分专家可能被过度使用（或闲置）。

### 3.1 辅助损失（Load Balancing Loss）

Mixtral 使用的负载均衡损失：

\[
\mathcal{L}_{\text{aux}} = N \cdot \sum_{i=1}^{N} \mathcal{F}_i \cdot \mathcal{P}_i
\]

其中：
- $\mathcal{F}_i$：分配给专家 $i$ 的 token 比例
- $\mathcal{P}_i$：路由器分配给专家 $i$ 的平均概率

当 $\mathcal{F}$ 和 $\mathcal{P}$ 均匀分布时损失最小。

### 3.2 Expert Capacity

限制每个专家处理的 token 上限：

\[
\text{capacity} = \frac{\text{tokens\_per\_batch}}{\text{num\_experts}} \times \text{capacity\_factor}
\]

超出 capacity 的 token 直接跳过专家（通过残差连接传递）。通常 $\text{capacity\_factor} = 1.25$。

## 4. 主流 MoE 模型

| 模型 | 总参数 | 专家数 | Top-K | 激活参数 |
|------|--------|--------|-------|----------|
| Mixtral 8×7B | 46.7B | 8 | 2 | 12.9B |
| DeepSeek-V2 | 236B | 160 | 6 | 21B |
| Qwen1.5-MoE | 14.3B | 64 | 8 | 2.7B |
| GPT-4 (传闻) | ~1.8T | 8-16 | 2 | ~200B |

## 5. 稀疏激活 vs 稠密激活

### 5.1 优势

- **参数量大但计算少**：总参数多但每个 token 只激活一小部分
- **专家专业化**：不同专家自然学习不同领域/语言/任务
- **训练效率**：同等计算量下可训练更多参数

### 5.2 挑战

- **显存需求大**：所有参数需要加载到显存
- **推理部署复杂**：批量推理时专家分配不规律
- **微调难度**：SFT 时训练-推理不一致问题
- **通信开销**：分布式训练中 expert parallelism 引入额外通信

## 6. Expert Parallelism

当专家分布在多个设备上时：

```
Device 0: Expert 0, Expert 1
Device 1: Expert 2, Expert 3
Device 2: Expert 4, Expert 5
Device 3: Expert 6, Expert 7

每个 token:
  1. Router 决定目标专家所在设备
  2. All-to-All 通信：将 token 发送到对应设备
  3. 各设备独立计算
  4. All-to-All 通信：传回结果
```

### 6.1 通信优化

DeepSpeed-MoE 的策略：
- **层次化 All-to-All**：节点内用 NCCL，节点间用专用拓扑
- **专家分组**：同组专家放在同设备，减少跨设备路由
- **Token 重排**：提前按专家分组重排 token，减少随机通信

## 7. 面试要点速记

- MoE 的关键公式：$y = \sum G(x)_i \cdot E_i(x)$
- Top-K 稀疏激活：只激活 K 个专家
- 负载均衡：辅助损失 + Expert Capacity
- 参数量 ≠ 计算量：Mixtral 47B 参数只有 13B 激活
- 推理需要所有参数驻留显存
- 分布式核心是 All-to-All 通信

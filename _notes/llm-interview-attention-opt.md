---
layout: notes
title: "Self-Attention 变体与优化"
series: llm-interview
series_order: 4
date: 2025-06-12
---

## 1. 从 Full Attention 到稀疏 Attention

标准 Self-Attention 的复杂度为 $O(n^2)$，序列长度 $n$ 增大时计算代价极高。主要优化方向：

| 方法 | 复杂度 | 代表模型 |
|------|--------|----------|
| Full Attention | $O(n^2)$ | 原始 Transformer |
| Sparse Attention | $O(n \cdot k)$ | Longformer, BigBird |
| Linear Attention | $O(n)$ | Performer, Linformer |
| Sliding Window | $O(n \cdot w)$ | Mistral |

## 2. Sliding Window Attention

Mistral 使用的核心技巧：每个 token 只关注前后固定窗口内的 token：

```
Token i 的注意力范围：[i - w, i + w]

其中 w = 4096 (Mistral-7B)
```

### 2.1 关键优势

- **固定内存**：每个 token 的 KV Cache 只保留窗口大小
- **长序列支持**：通过堆叠多层，信息可以跨窗口传播
- **实现简单**：只需在 attention mask 中截断

### 2.2 信息传播分析

即使每层只关注窗口内的 token，通过多层堆叠，第 $L$ 层的感受野可以覆盖 $L \times w$ 范围。对于 32 层的 Mistral，理论感受野约 13 万 token。

## 3. Flash Attention

Flash Attention 不改变计算量（仍是 $O(n^2)$），但通过**内存优化**大幅加速：

### 3.1 核心思想

标准实现瓶颈不在计算而在**显存带宽**：

```
步骤：
1. 计算 QK^T → 写入 HBM（大矩阵，n × n）
2. 从 HBM 读取 → 计算 softmax
3. 计算 softmax × V → 写入结果
```

Flash Attention 使用 **tiling** 将注意力矩阵分块，在 SRAM 中完成完整计算：

```
对每个块：
  Q_block 加载进 SRAM
  对每个 K_block, V_block：
    K_block, V_block 加载进 SRAM
    在 SRAM 中计算并累积：
      S = Q_block @ K_block^T
      P = softmax(S)
      O += P @ V_block
  写回 HBM：O_block
```

### 3.2 为什么更快

- **减少 HBM 读写**：$O(n^2)$ 的中间矩阵不再写回显存
- **SRAM 带宽优势**：SRAM 带宽比 HBM 高 10x+
- **在线 softmax**：使用数值稳定的增量式计算

## 4. Multi-Query Attention (MQA)

所有 Q 头共享同一组 K 和 V：

```
MHA:  Q_1..Q_h,  K_1..K_h,  V_1..V_h
MQA:  Q_1..Q_h,  K (共享),  V (共享)
```

### 4.1 优缺点

**优点**：
- KV Cache 减少 $h$ 倍
- 推理时显存和带宽大幅降低
- 训练时更快的交叉注意力计算

**缺点**：
- 模型质量略有下降（注意力表达能力受限）
- 训练可能不太稳定

### 4.2 GQA 作为折中

GQA（Grouped-Query Attention）将 Q 头分组，每组共享 K、V：

```python
# 8个Q头，4组 → 每组2个Q头共享1组KV
num_kv_heads = num_heads // num_groups  # 8 // 4 = 2
```

| 配置 | KV Cache | 质量 |
|------|----------|------|
| MHA (h=8) | 8× | 最佳 |
| GQA (g=4) | 2× | 接近 MHA |
| MQA | 1× | 略低 |

LLaMA 2 70B 使用 GQA 取得了良好的速度-质量平衡。

## 5. Paged Attention (vLLM)

vLLM 将 KV Cache 类比为**虚拟内存**，按页管理：

```
传统方式：
  KV Cache: [████████████████]  ← 连续预分配，碎片化严重

Paged Attention：
  Block 0: [████]
  Block 1: [████]    ← 按页分配，按需扩展
  Block 2: [████]
```

### 5.1 优势

- **零碎片**：不需要预分配最大长度
- **高效共享**：多请求可共享同一 prefix 的 KV Cache
- **内存利用率**：接近 100%（传统方式约 20-40%）

## 6. 选型建议

| 场景 | 推荐方法 |
|------|----------|
| 训练（短序列） | Flash Attention v2 |
| 推理（高吞吐） | vLLM + GQA |
| 长文档处理 | Sliding Window 或 Sparse Attention |
| 超长序列 | Linear Attention 变体 |

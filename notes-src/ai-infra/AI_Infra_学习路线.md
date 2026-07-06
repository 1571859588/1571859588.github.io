# AI Infra 学习路线（2028届，13个月准备期）

> 起始：2026年7月（研一升研二暑假）
> 目标：2027年8月秋招提前批拿Infra offer
> 总时长：约13个月，分4个阶段

---

## 阶段一：打地基（2026.7 – 2026.9，3个月）

**目标**：补齐Infra必备的底层硬技能。这阶段最枯燥但最值钱，地基不牢后面全垮。

### 1. C++（必备，Infra主语言）
- **为什么**：vLLM、TensorRT、CUDA runtime都是C++，面试必考。
- **学到什么程度**：能读懂开源项目源码，能写模板，理解RAII、智能指针、移动语义。
- **资源**：
  - 《Effective C++》过一遍（挑重点条款）
  - LeetCode用C++刷100题（重点：STL、智能指针实战）
  - 读懂一个C++开源项目：推荐 **vLLM 的 C++ 部分** 或 **brpc**

### 2. 操作系统（面试高频）
- **重点**：进程/线程/协程、内存管理（虚拟内存、页表）、IO模型（epoll/select）、锁机制。
- **资源**：
  - MIT 6.S081（xv6 lab，选做2-3个lab）
  - 《深入理解计算机系统》CSAPP 第8-12章
  - 自己实现一个简易线程池

### 3. 计算机网络
- **重点**：TCP/IP、HTTP/2、RDMA（Infra加分项，大模型训练通信用）。
- **资源**：
  - 小林coding图解网络（快速过）
  - RDMA：看NVIDIA Mellanox官方文档 + 读一篇NCCL源码导读

### 4. Linux & 性能调优
- **重点**：能看懂 `perf`、`nvidia-smi`、`htop`，理解CPU缓存、NUMA。
- **资源**：
  - 《性能之巅》挑章节读
  - 实操：在自己的机器/云GPU上跑vLLM，用perf分析瓶颈

### 5. CUDA 入门（核心差异化）
- **为什么**：这是Infra和普通后端最大的区别，也是护城河。
- **学到什么程度**：能写kernel，理解thread/block/grid，会优化memory access。
- **资源**：
  - NVIDIA官方《Programming Guide》+《Best Practices Guide》
  - UIUC ECE408 课程（公开课，配套lab）
  - 跑通向量加法、矩阵乘法、reduce三个基础kernel
  - 读一篇经典论文：FlashAttention 的 CUDA 实现

---

## 阶段二：核心栈攻坚（2026.10 – 2027.2，5个月，研二上+寒假）

**目标**：吃透大模型推理/训练框架源码，能讲清楚原理和实现细节。这是面试主战场。

### 1. 推理框架（重中之重）
- **vLLM**（必读）：
  - PagedAttention 原理（KV Cache 分页管理）
  - Continuous Batching 调度
  - 读 `vllm/core/scheduler.py` + `vllm/attention/backends/`
  - 自己跑benchmark，对比不同batch策略
- **SGLang**（次选，新兴）：
  - RadixAttention 原理
  - 对比vLLM的差异
- **TensorRT-LLM**（了解）：
  - NVIDIA官方推理框架，面试会问

### 2. 训练框架
- **DeepSpeed**（必读）：
  - ZeRO 1/2/3 原理（参数/梯度/优化器分片）
  - 读懂 `deepspeed/runtime/engine.py`
  - 跑通一个ZeRO-3训练demo
- **Megatron-LM**（必读）：
  - 张量并行（TP）、流水线并行（PP）原理
  - 通信原语：all-reduce、all-gather、reduce-scatter
  - 读 `megatron/core/tensor_parallel/`

### 3. 通信库
- **NCCL**：理解ring all-reduce、tree all-reduce
- **读论文**：Megatron-LM、DeepSpeed ZeRO、FlashAttention、PagedAttention

### 4. 量化与压缩（加分项）
- INT8/INT4量化：GPTQ、AWQ、SmoothQuant
- KV Cache量化
- 跑一个vLLM + AWQ的推理demo

### 5. 阶段产出
- 写2-3篇技术博客（知乎/个人博客）：vLLM源码解析、ZeRO原理等
- 在GitHub维护一个repo：Infra学习笔记或mini实现

---

## 阶段三：实战与背书（2027.3 – 2027.5，3个月，研二下）

**目标**：用项目/PR/实习背书证明能力，为暑期实习和秋招攒弹药。

### 1. 给开源项目贡献PR
- **目标项目**：vLLM、SGLang、DeepSpeed、ColossalAI
- **怎么找issue**：good first issue、文档改进、小bug修复
- **目标**：至少1个被merge的PR，这是简历上最有说服力的一条
- **进阶**：提一个性能优化PR（即使只是小优化）

### 2. 做一个能讲清楚的Infra项目
二选一：
- **方案A**：mini-vLLM —— 用Python+CUDA实现一个简化版PagedAttention推理引擎（1000行内）
- **方案B**：benchmark工程 —— 对比vLLM/SGLang/TensorRT-LLM在特定场景的性能，写一份完整性能分析报告

### 3. 投暑期实习（关键！转正机会）
- **时间**：2027年3-5月投递，6-8月实习
- **目标公司**：见投递清单文档
- **目标**：拿到return offer，秋招直接上岸
- **简历叙事**：把港中文的Agent项目重构为"大模型应用系统工程"经历

### 4. 算法题保持
- 每周3-5题LeetCode，保持手感
- 重点：树、图、动态规划、系统设计题

---

## 阶段四：冲刺（2027.6 – 2027.12，7个月，研二暑假+研三上）

**目标**：实习转正 + 秋招拿offer。

### 1. 暑期实习（6-8月）
- 全力争取return offer
- 实习中主动接触Infra相关工作（推理优化、训练加速）
- 每周记录技术成长，攒面试素材

### 2. 秋招提前批（8月）
- 8月初集中投递，华为/阿里/字节等都有提前批
- 提前批竞争相对小，是黄金机会

### 3. 秋招正式批（9-11月）
- 持续投递、面试
- 多拿offer谈薪

### 4. 面试高频考点清单
- [ ] PagedAttention 原理 + 手画结构
- [ ] ZeRO 1/2/3 区别 + 通信量计算
- [ ] TP/PP 原理 + 通信开销
- [ ] FlashAttention 为什么快
- [ ] KV Cache 大小计算
- [ ] Continuous Batching vs Static Batching
- [ ] 手撕：矩阵乘法CUDA kernel
- [ ] 手撕：生产者消费者模型（C++）
- [ ] 系统设计：设计一个高吞吐LLM推理服务

---

## 时间分配建议（每周）

| 阶段 | 技术学习 | 项目/PR | 算法题 | 八股/面试 |
|------|---------|---------|--------|----------|
| 阶段一 | 80% | 10% | 10% | 0% |
| 阶段二 | 60% | 25% | 10% | 5% |
| 阶段三 | 30% | 40% | 15% | 15% |
| 阶段四 | 10% | 20% | 20% | 50% |

---

## 关于港中文公司的工作

- **降级处理**：不要All in，把它当作"有收入的兼职项目"
- **时间投入**：尽量压缩到每周2-3天，剩下的时间给Infra
- **沟通策略**：研二上找导师/负责人谈，说明要准备秋招，争取减负
- **价值挖掘**：把Agent项目里的工程实践（并发、调度、性能）提炼成Infra面试素材
- **退出时机**：2027年3月前如果拿到暑期实习offer，可考虑退出

---

## 风险提示

1. **别贪多**：每个阶段聚焦2-3个核心目标，宁可深不要广
2. **源码 > 论文 > 视频**：Infra面试考的是你懂不懂实现，不是懂不懂概念
3. **CUDA是分水岭**：能写CUDA kernel的应届生极少，这是你最大的差异化
4. **博客/PR是硬通货**：比论文管用，面试官能直接看到你的工程能力
5. **暑期实习 > 一切**：return offer是最稳的上岸路径，2027年3-5月投递窗口别错过

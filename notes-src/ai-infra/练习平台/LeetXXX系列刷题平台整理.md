# LeetXXX 系列刷题平台整理（官方正统 + 领域衍生）

> 更新时间：2026-07-02
> 状态：工具收集笔记，按"官方正统 + 独立第三方"分层
> 用途：汇总所有 Leet 前缀的刷题平台/板块，重点服务 AI Infra 推理优化方向
> 关联：本目录 `算法刷题在线练习平台.md`（通用算法）、`在线GPU练习平台汇总.md`（GPU 算力平台）

---

## 一句话结论

**LeetXXX 系列分两类**：① LeetCode 官方主站内的赛道板块（Database/Shell/Concurrency/Pandas/Design，非独立域名）；② 独立第三方「LeetXXX」专项刷题站。**对 AI Infra 推理优化方向，核心必刷 LeetGPU（线上真机调 CUDA/Triton 算子）+ LeetCUDA（本地手写 CUDA Kernel）**，其余按需补充。

---

## 一、正统官方 LeetCode 旗下分类（同一网站内板块，不是独立域名）

就是力扣官网内置赛道，名字带 Leet，均位于主站 `leetcode.cn` 内：

| 赛道 | 入口 | 定位 | 推荐度 |
|------|------|------|--------|
| **LeetCode** | https://leetcode.cn/ | 主站，算法/数据结构 | ⭐⭐⭐⭐⭐ |
| **LeetDatabase** | leetcode.cn 内 SQL 板块 | 数据库 SQL 专项刷题 | ⭐⭐⭐⭐ |
| **LeetShell** | leetcode.cn 内 Shell 板块 | Shell 脚本专项 | ⭐⭐⭐ |
| **LeetConcurrency** | leetcode.cn 内并发板块 | 多线程并发编程（C++/Java/Python 锁、协程、竞争条件） | ⭐⭐⭐⭐ |
| **LeetPandas** | leetcode.cn 内 Pandas 板块 | Python 数据分析、Pandas 数据处理题 | ⭐⭐⭐ |
| **LeetDesign** | leetcode.cn 内设计板块 | 系统设计/面向对象设计（OOD）题目 | ⭐⭐⭐⭐ |

> 💡 这些板块共享 LeetCode 主站账号，无需单独注册。在主站顶栏「题库」分类下可找到对应赛道。

---

## 二、独立第三方「LeetXXX」专项刷题站

### 2.1 GPU/CUDA 推理优化赛道（适配 AI Infra 推理优化方向）⭐ 核心

| 平台 | 类型 | 链接 | 说明 |
|------|------|------|------|
| **LeetGPU** | 独立网站 | https://leetgpu.com/ | 浏览器在线跑真实 A100/H100，CUDA / Triton / PyTorch 算子刷题，矩阵乘、KV Cache、算子融合、显存优化，大厂推理面试专用题库 |
| **LeetCUDA** | 开源仓库 | https://github.com/xlite-dev/LeetCUDA | GitHub 开源 CUDA 算子题库，200+ 手写 Kernel 练习题，HGEMM、FlashAttention、量化算子配套教程，本地编译自测 |
| LeetTriton | 社区俗称（无独立域名） | LeetGPU 内置 Triton 赛道 | LeetGPU 内置 Triton 赛道，专门练大模型 Triton 算子，LLM 推理高频 |

#### LeetGPU 详解（核心必刷）

**网址**：https://leetgpu.com/

- 浏览器内直接编写并运行 GPU Kernel，**无需本地 GPU**
- 支持真实 A100/H100 硬件跑 benchmark
- 题目覆盖：CUDA Kernel 手写、Triton 算子、PyTorch 算子融合、显存优化
- 大厂（字节/商汤/旷视/地平线）AI Infra 推理优化面试专用题库
- 有 playground 在线调试：https://leetgpu.com/playground

**适合**：阶段三（CUDA 基础）→ 阶段五（推理优化）全流程，面试前重点刷矩阵乘、KV Cache、FlashAttention 类算子题

#### LeetCUDA 详解（辅助练习）

**仓库**：https://github.com/xlite-dev/LeetCUDA

- 200+ CUDA 算子实现练习题，从入门到困难
- 覆盖：HGEMM（高性能矩阵乘）、FlashAttention、量化算子（INT8/FP8）
- 含学习笔记 + 性能对标官方库
- 本地编译自测，适合深度手写 CUDA Kernel

**适合**：阶段三深入 CUDA 编程，配合 `leetgpu/` 目录下的本地练习（项目根目录已有 `leetgpu/` 文件夹）

### 2.2 其他领域独立 LeetXXX 刷题平台

> ⚠️ 以下平台部分为社区概念或小众站点，独立官网待验证，使用前请自行确认可用性。

| 平台 | 领域 | 说明 | 官网待验证 |
|------|------|------|-----------|
| **LeetSQL** | SQL 调优 | 独立 SQL 刷题站，海量数据库面试题，比 LeetCode 数据库板块更偏业务 SQL 调优 | ⚠️ 待验证 |
| **LeetSystem** | 系统编程 | 系统编程专项（Linux C、内存、IO、网络、RPC、并发），后端/AI Infra 底层岗刷题 | ⚠️ 待验证 |
| **LeetML / LeetAI** | 机器学习 | 机器学习专项题库，手动实现 SVM、CNN、Transformer、梯度推导，适合算法岗 | ⚠️ 待验证 |
| LeetRust | Rust 语言 | Rust 语言专项算法 + 内存安全刷题 | ⚠️ 待验证 |
| LeetFrontend | 前端 | 前端面试刷题（JS、DOM、React、工程化） | ⚠️ 待验证 |
| LeetBlockchain | 区块链 | 区块链智能合约、Solidity 刷题 | ⚠️ 待验证 |

> 💡 对于 SQL 刷题，已验证可用的替代方案：LeetCode Database 板块、牛客网 SQL 题、SQLZoo（https://sqlzoo.net/）。

---

## 三、容易混淆的同类平台（名字近似但不带 Leet 后缀）

| 平台 | 链接 | 说明 |
|------|------|------|
| **LintCode（领扣）** | https://www.lintcode.com/ | 国内对标 LeetCode，题库有重叠 |
| **GPU Puzzles** | https://github.com/srush/GPU-Puzzles | 轻量 GPU 并行入门题（14 道，numba CUDA，可视化），适合 CUDA 入门第一站 |
| **CUTLASS Samples** | https://github.com/NVIDIA/cutlass/tree/main/examples | NVIDIA 官方算子练习（无 Leet 前缀），CUTLASS 矩阵乘模板库示例 |
| **Triton Tutorials** | https://triton-lang.org/main/getting-started/tutorials/index.html | OpenAI Triton 官方教程（无 Leet 前缀），从矩阵乘到 FlashAttention |
| **CodeSignal** | https://codesignal.com/ | 通用面试刷题平台 |
| **HackerRank** | https://www.hackerrank.com/ | 通用面试刷题平台 |

> 💡 **GPU Puzzles** 是 CUDA 入门最友好的第一站：14 道题 + 可视化结果，用 numba 写 CUDA，在 Colab 直接跑。学完再转 LeetGPU 上真 CUDA/Triton。

---

## 四、针对「AI Infra 推理优化」路线推荐优先级

| 优先级 | 平台 | 用途 | 阶段对应 |
|--------|------|------|----------|
| **P0 核心必刷** | **LeetGPU** | 线上真机调 CUDA/Triton 算子，面试最贴合 | 阶段三/五 |
| **P1 辅助练习** | **LeetCUDA** | 本地深度手写 CUDA Kernel | 阶段三 |
| **P1 入门第一站** | **GPU Puzzles** | CUDA 并行思维入门（14 题可视化） | 阶段三开头 |
| P2 底层铺垫 | LeetConcurrency、LeetSystem | 多卡通信、NCCL、系统内存 | 阶段三/四 |
| P2 基础算法 | 主站 LeetCode | 数组、滑动窗口、图并行算法 | 全阶段 |
| P3 参考补充 | CUTLASS Samples、Triton Tutorials | 官方算子实现参考 | 阶段五进阶 |

### 刷题路径建议（AI Infra 方向）

```
1. GPU Puzzles（14题，建立并行思维）
   ↓
2. LeetCUDA（本地手写 CUDA Kernel，从 vector_add 到 HGEMM）
   ↓
3. LeetGPU（线上真机 benchmark，练矩阵乘/KV Cache/算子融合/显存优化）
   ↓  并行
4. LeetCode 主站（保持算法手感，Hot 100 + 滑动窗口/图论）
   ↓
5. CUTLASS Samples / Triton Tutorials（进阶参考，面试前补深度）
```

---

## 五、相关链接

- 本目录 `算法刷题在线练习平台.md`（通用算法刷题平台，LeetCode 主站详解）
- 本目录 `在线GPU练习平台汇总.md`（GPU 算力租赁平台，Colab/Kaggle/AutoDL）
- 本目录 `AI竞赛与数据科学练习平台.md`（Kaggle 等数据科学竞赛）
- 项目根目录 `leetgpu/`（本地 LeetCUDA 练习代码）
- `技术工具学习索引.md`

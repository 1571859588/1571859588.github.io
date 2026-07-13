# 环境隔离与 GPU 环境诊断

> 来源：AI Infra 前置基础 → 第 8 章 环境隔离与 GPU 软件栈
> 笔记类型：学习笔记
> 目标：从零开始，用完整示例讲清楚"venv/conda/容器各管什么、GPU 软件栈分几层、环境出问题按什么顺序查"
> 更新时间：2026-07-06（补充 uv 管理工具与 venv/conda/Docker 的对比）
> 关联：本目录 `2. Docker与Nvidia-Docker2.md`、`3. GPU-CUDA与cuDNN软件栈.md`

---

## 一句话结论

环境隔离工具不是互斥的，是**三个层次**：venv 管 Python 包、conda 多管一部分原生库、Docker 把整个用户态都隔离。GPU 环境出问题别全删重装，按"驱动 → Toolkit → 框架来源 → 框架看到的设备"四步链路定位，一次只改一个变量。

---

## 一、为什么需要环境隔离

先看一个真实的版本地狱场景：

```
模型 A：需要 CUDA 11.8 + Python 3.9 + PyTorch 1.13
模型 B：需要 CUDA 12.1 + Python 3.11 + PyTorch 2.3
模型 C：需要 PyTorch 2.0 + 旧版 transformers
模型 D：自定义算子，要特定 GCC 编译

如果都装在宿主机：一个崩全崩，重装一次毁掉其他三个
```

环境隔离的本质是**让不同项目的依赖互不干扰**。但不同工具隔离的"范围"不同，下面三个层次递进。

---

## 二、venv / conda / 容器：三个隔离层次

### 2.1 三者对比（核心概念）

| 工具 | 隔离范围 | 不隔离什么 | 适合场景 | 不适合场景 |
|------|---------|-----------|---------|-----------|
| **venv** | Python 解释器 + pip 包 | 原生库、系统工具链、CUDA | 纯 Python 项目、依赖简单 | 需要 CUDA、cuDNN 等原生库 |
| **uv** | Python 包 + Python 版本管理（可装指定版本 Python），速度极快 | 原生库、系统工具链、CUDA | 纯 Python 项目、追求速度和锁文件复现 | 需要原生库（同 venv） |
| **conda** | Python + pip 包 + 一部分原生库（如 numpy 的 MKL 版） | 系统级驱动、内核 | 科学计算、复杂二进制依赖 | 需要隔离 CUDA Toolkit 版本 |
| **Docker/容器** | 整个用户态：文件系统、库、工具链、进程 | 内核、驱动、硬件 | 部署、CI、跨机器复现 | 单机开发小改小闹 |

**关键理解**：三者不是"二选一"，而是**层次递进**。一个项目可能同时用 venv（管 Python 包）+ Docker（管整体环境），互不冲突。

### 2.2 venv 完整示例

```bash
# ========== 创建虚拟环境 ==========
cd ~/projects/my_model
python -m venv .venv              # 在 .venv/ 目录创建虚拟环境
# .venv/bin/python    ← 独立的 Python 解释器（软链到系统 Python）
# .venv/bin/pip       ← 独立的 pip
# .venv/lib/python3.x/site-packages/  ← 独立的包目录

# ========== 激活 ==========
source .venv/bin/activate         # 激活后，命令行前面会出现 (.venv)
# 激活后 which python 会指向 .venv/bin/python，不再是系统 Python

# ========== 装包 ==========
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# ⚠️ 为什么用 `python -m pip` 而不是 `pip`？
# 因为直接 `pip install` 可能调用的是别的环境的 pip：
#   - 没激活 venv 时，pip 是系统的，装到全局污染
#   - 激活 venv 后 pip 通常也对了，但 `python -m pip` 更保险：
#     它保证"用当前 python 对应的 pip"，避免"运行 A 环境的 Python
#     却调 B 环境的 pip"这种混淆

# ========== 退出 ==========
deactivate                        # 退出虚拟环境，回到系统 Python
```

**实际场景**：写一个纯 PyTorch 推理脚本，系统 CUDA 已装好，只需要隔离 Python 包版本——venv 就够了。

### 2.3 conda 完整示例

```bash
# ========== 创建环境 ==========
conda create -n ai-infra python=3.12
# conda 比 venv 多管什么？
#   - Python 解释器本身（venv 只能软链系统的，conda 可以装指定版本）
#   - 一部分原生库（如 numpy 的 MKL 加速版、libgcc 等）
#   - 一些工具链（如 conda install cmake gxx）

conda activate ai-infra           # 激活
# which python → ~/miniconda3/envs/ai-infra/bin/python

# ========== 装包 ==========
conda install pytorch pytorch-cuda=12.1 -c pytorch -c nvidia
# conda 装的 PyTorch 自带 CUDA runtime 库，
# 不需要宿主机有 nvcc，只要驱动版本够高就能跑

# ========== 导出环境（锁定复现） ==========
conda env export --from-history > environment.yml
# --from-history 只记录你显式安装的包，不记录自动装的依赖
# 好处：在另一台机器 conda env create -f environment.yml 时，
#       conda 会重新解析依赖，得到兼容的新版本，而不是死扣旧依赖

# ⚠️ 注意：environment.yml 不是完整环境描述
# 它不包含：操作系统版本、NVIDIA 驱动版本、内核版本、硬件架构（x86 vs arm）
# 所以"在我这能跑在你那不能跑"的情况，environment.yml 救不了你
# 真正的完整环境复现需要容器（见下节）
```

**实际场景**：数据科学项目，需要 numpy/scipy/pandas 的 MKL 加速版，又不想自己编——用 conda 一键装好。

### 2.4 Docker 完整示例

```bash
# ========== GPU 容器：跑一个 CUDA 镜像 ==========
docker run --rm -it \
  --gpus all \
  -v "$PWD:/workspace" \
  -w /workspace \
  nvidia/cuda:12.4.1-runtime-ubuntu22.04 \
  nvidia-smi

# 逐行解释：
# docker run          启动容器
# --rm                容器退出后自动删除（不留垃圾）
# -it                 交互模式 + 分配终端
# --gpus all          把宿主机所有 GPU 透传给容器（关键！）
# -v "$PWD:/workspace" 把当前目录挂载到容器内 /workspace
# -w /workspace       容器内工作目录设为 /workspace
# nvidia/cuda:12.4.1-runtime-ubuntu22.04  镜像名:tag
# nvidia-smi          容器启动后执行的命令

# 输出会显示 GPU 信息，说明容器成功访问到了宿主机 GPU
```

**镜像 tag 怎么选**：

| tag 后缀 | 内容 | 体积 | 用途 |
|---------|------|------|------|
| `base` | 最小，只有 CUDA Runtime | ~500MB | 只跑预编译程序 |
| `runtime` | base + cuDNN + 常用数学库 | ~2GB | 跑框架（PyTorch/TensorFlow） |
| `devel` | runtime + nvcc + 头文件 + 调试工具 | ~4GB | 编译自定义 CUDA 算子 |

**版本要钉死**：`nvidia/cuda:12.4.1-runtime-ubuntu22.04`（具体到补丁号）比 `nvidia/cuda:latest` 安全得多。`latest` 会漂移，今天能跑明天可能就崩。

### 2.5 uv 完整示例（现代替代 venv+pip）

uv 是用 Rust 写的 Python 包管理器（2024 年 Astral 公司出品），**一个工具替代了 pip + venv + pip-tools + pyenv**，速度快 10~100 倍。隔离范围和 venv 一样（只管 Python 包），但体验好得多。

```bash
# ========== 安装 uv ==========
curl -LsSf https://astral.sh/uv/install.sh | sh
# 装完后 uv 命令就在 PATH 里了（重启终端或 source ~/.bashrc）

# ========== 方式 A：项目管理模式（推荐，类似 cargo/npm） ==========
cd ~/projects/my_model
uv init                     # 生成 pyproject.toml + .python-version + README
#   pyproject.toml  ← 项目配置 + 依赖声明（替代 requirements.txt）
#   .python-version ← 指定 Python 版本（如 3.12）

uv add torch==2.3.0 transformers numpy
#   自动：创建 .venv → 装 Python（如果没有）→ 装包 → 写入 pyproject.toml → 生成 uv.lock
#   uv.lock 是跨平台锁文件，记录所有依赖的精确版本和 hash

uv add --dev pytest ruff    # 装开发依赖（只在开发时装，不进生产）

uv run python train.py      # ★自动管理环境并运行（不用手动 activate！）
#   uv run 会：检查 .venv → 缺什么装什么 → 用 .venv 的 python 跑你的脚本
#   这是最省心的用法，不需要 source activate

uv sync                     # 根据 pyproject.toml + uv.lock 同步环境
#   别人 clone 你的项目后，一条 uv sync 就能装好所有依赖

uv lock --upgrade           # 更新锁文件（检查有没有新版本可升级）

uv remove transformers      # 卸载并从 pyproject.toml 移除

# ========== 方式 B：兼容 pip 模式（渐进迁移） ==========
uv venv .venv               # 创建虚拟环境（替代 python -m venv）
source .venv/bin/activate
uv pip install -r requirements.txt   # 和 pip 用法一样，但快得多
uv pip install torch transformers
uv pip freeze > requirements.txt
#   如果不想改现有项目结构，uv 可以当"更快的 pip"用

# ========== uv 的独有能力 ==========
# 1. 管理 Python 版本（替代 pyenv）
uv python install 3.11 3.12 3.13    # 装多个 Python 版本
uv python list                       # 看有哪些版本可用
uv python pin 3.12                   # 给当前项目固定 Python 版本
#   venv 做不到这点——venv 只能软链系统已有的 Python，uv 能自己装

# 2. 跨平台锁文件（uv.lock）
#   requirements.txt 只记包名版本，uv.lock 记录：精确版本 + hash + 依赖关系 + 平台信息
#   在 Linux 生成 uv.lock，到 macOS 上 uv sync 也能正确装（会装对应平台的 wheel）
#   比 pip-compile 的 requirements.lock 更强

# 3. 单文件脚本依赖（PEP 723，见 linux/Linux开发基本功_新人入门版.md 2.4 节）
#   脚本第一行声明依赖，uv run 自动建临时环境：
#   # /// script
#   # dependencies = ["requests", "rich"]
#   # ///
#   import requests, rich
#   uv run script.py    # 自动装 requests+rich 到临时环境并运行

# 4. uv run 不需要 activate
#   传统流程：source .venv/bin/activate → python xxx.py → deactivate
#   uv 流程：uv run xxx.py（省去 activate/deactivate，环境自动管理）
```

**uv vs venv+pip 的核心区别**：

| 维度 | venv + pip | uv |
|------|-----------|-----|
| 速度 | 慢（串行下载+解析） | 快 10~100 倍（Rust + 并行 + 全局缓存） |
| Python 版本管理 | 不支持（只能用系统的） | 支持（uv python install） |
| 锁文件 | 需要 pip-tools 额外生成 | 内置 uv.lock（跨平台） |
| 依赖声明 | requirements.txt（手动维护） | pyproject.toml（uv add 自动维护） |
| 运行方式 | activate 后 python xxx.py | uv run xxx.py（不用 activate） |
| 全局缓存 | 无（每个 venv 各装一份） | 有（全局缓存，多项目共享） |
| 隔离范围 | Python 包 | Python 包（和 venv 一样） |

**实际场景**：新项目直接用 uv（uv init → uv add → uv run），比 venv+pip 快太多且锁文件完善；老项目可以用 uv pip 兼容模式渐进迁移。

**uv 管不了什么**（和 venv 一样的局限）：原生库（CUDA、cuDNN、MKL）、系统工具链、GPU 驱动。需要这些还是得上 conda 或 Docker。

### 2.6 选型决策树

```
你的项目需要隔离什么？
│
├─ 只需要 Python 包版本隔离
│  ├─ 新项目 / 追求速度和锁文件 → uv（推荐，比 venv+pip 快 10~100 倍）
│  └─ 不想装新工具 / 极简需求   → venv（系统自带）
│
├─ 需要 Python + 一部分原生库（MKL、特定 numpy）
│  └─ → conda（比 venv/uv 多管原生库）
│
├─ 需要隔离 CUDA Toolkit 版本（一个机器跑多个 CUDA 版本）
│  └─ → Docker（venv/uv/conda 都管不了 CUDA Toolkit）
│
└─ 需要跨机器完整复现（CI/部署/交付给客户）
   └─ → Docker（连 OS、库、工具链一起打包）
```

> **uv vs venv 一句话**：隔离范围一样（都只管 Python 包），但 uv 速度快、自带锁文件、能管 Python 版本、不用 activate（uv run 直接跑）。新项目首选 uv，uv 管不了的（原生库/CUDA）才上 conda 或 Docker。

---

## 三、容器不是虚拟机（关键概念）

### 3.1 虚拟机 vs 容器

| 维度 | 虚拟机（VM） | 容器（Container） |
|------|-------------|------------------|
| 隔离层级 | **硬件层**（虚拟 CPU/内存/磁盘） | **用户态**（文件系统、进程、网络） |
| 内核 | 每个 VM 有自己的内核 | **共享宿主机内核** |
| 启动时间 | 分钟级 | 秒级 |
| 资源占用 | 重（要跑完整 OS） | 轻（只跑用户态进程） |
| 隔离强度 | 强（hypervisor 隔离） | 弱（共享内核，逃逸风险更高） |
| GPU 透传 | 难（要 SR-IOV 或直通） | 简单（`--gpus all`） |

**最关键的区别**：容器**没有自己的内核**，所有容器和宿主机跑在同一个 Linux 内核上。容器只是"被隔离的进程"。

### 3.2 GPU 容器怎么用上 GPU

```
┌─────────────────────────────────────────┐
│  宿主机                                  │
│  ┌──────────────────────────────────┐   │
│  │ Linux 内核                        │   │
│  │  ┌─────────────────────────┐     │   │
│  │  │ NVIDIA 内核态驱动        │     │   │
│  │  │  (nvidia.ko, 已加载)     │     │   │
│  │  └─────────────────────────┘     │   │
│  └──────────────────────────────────┘   │
│       ↑ 共享内核                         │
│  ┌────┴───────────┐  ┌──────────────┐  │
│  │ 容器 A          │  │ 容器 B        │  │
│  │ PyTorch+cu121   │  │ vLLM+cu124    │  │
│  │ (用户态进程)    │  │ (用户态进程)  │  │
│  └────────────────┘  └──────────────┘  │
│       ↑ --gpus all                      │
│  NVIDIA Container Toolkit 把宿主机的    │
│  libcuda.so 和 /dev/nvidia* 设备        │
│  挂载进容器，容器就能调 GPU             │
└─────────────────────────────────────────┘
```

**核心机制**：
1. 内核态驱动（`nvidia.ko`）只在**宿主机装一次**，容器不装
2. NVIDIA Container Toolkit（旧名 nvidia-docker2）负责把 `/dev/nvidia0`、`/dev/nvidiactl` 等设备文件和 `libcuda.so` 用户态库挂载进容器
3. 容器内进程通过 `libcuda.so` → 系统调用 → 共享内核里的 `nvidia.ko` → GPU

**实际意义**：
- 宿主机驱动版本必须 ≥ 容器内 CUDA 要求的版本（向下兼容）
- 容器内可以装不同版本的 CUDA Toolkit（nvcc、cudart），但都共用同一个驱动
- 升级宿主机驱动 = 升级所有容器的驱动；想锁死某个容器的驱动版本？做不到，只能锁宿主机

### 3.3 卷挂载的安全提示

```bash
docker run -v "$PWD:/workspace" some-image some-command
#                 ↑ 把宿主机当前目录挂进容器
```

**风险**：容器内进程对 `/workspace` 的写操作会**直接落到宿主机目录**。如果跑的是陌生命令（别人给的脚本、网上抄的镜像），它可能：
- `rm -rf /workspace/*` 删你的代码
- 改文件权限（root 写入，你普通用户改不回来）
- 读取你的 `.env`、`~/.ssh/`（如果挂载了 home）

**习惯**：
- 跑不信任的镜像/命令前，先看清楚 `-v` 挂了什么
- 用只读挂载做测试：`-v "$PWD:/workspace:ro"`（容器内只能读不能写）
- 不要把 `~/.ssh`、`~/.aws` 这种目录挂进陌生容器

---

## 四、GPU 软件栈：四层容易混淆的部分

### 4.1 四层结构

```
┌─────────────────────────────────────────┐
│ 应用层：PyTorch / vLLM / 自定义扩展     │  ← 你写的代码、装的框架
├─────────────────────────────────────────┤
│ CUDA Runtime + 数学库                    │  ← cudart、cuBLAS、cuDNN、
│ (libcudart.so, libcublas.so, libcudnn)  │    NCCL 等 .so 库
├─────────────────────────────────────────┤
│ 用户态驱动库                             │  ← libcuda.so（驱动装的时候带）
│ (libcuda.so)                            │
├─────────────────────────────────────────┤
│ 内核态 NVIDIA Driver                     │  ← nvidia.ko，装在宿主机内核
│ (nvidia.ko)                             │
├─────────────────────────────────────────┤
│ GPU 硬件                                 │  ← A100 / A10 / V100 ...
└─────────────────────────────────────────┘
```

### 4.2 四层职责详解

| 层 | 是什么 | 谁装的 | 怎么验证 |
|----|--------|--------|---------|
| **NVIDIA Driver** | OS 与 GPU 通信的基础，含内核态模块 + 用户态 `libcuda.so` | 宿主机 `apt install nvidia-driver-535` | `nvidia-smi` 能输出 |
| **CUDA Toolkit** | 开发工具集合：nvcc 编译器、头文件、调试/分析工具 | 宿主机 `.run` 安装，或 Docker `devel` 镜像 | `nvcc --version` |
| **CUDA Runtime + 数学库** | 应用运行时加载的 `.so`：cudart、cuBLAS、cuDNN、NCCL | Toolkit 自带 cudart；cuDNN 单独装；PyTorch wheel 里也打包了一份 | `ldd torch/_C.so \| grep cuda` |
| **cuDNN** | 深度学习算子加速库（卷积、注意力等），不等于整个 CUDA | 单独装 `libcudnn8`，或 PyTorch wheel 自带 | `dpkg -l \| grep cudnn` |

### 4.3 三个版本号查询命令的区分（面试必考）

新手最常踩的坑：以为 `nvidia-smi` 显示的 CUDA 版本就是实际装的 CUDA 版本。

| 命令 | 显示的是什么 | 例子 | 说明 |
|------|-------------|------|------|
| `nvidia-smi` | 驱动**支持的最高** CUDA 兼容级别 | `CUDA Version: 12.2` | 不是实际安装的 CUDA，是驱动允许装的最高版本 |
| `nvcc --version` | 实际安装的 **CUDA Toolkit** 版本 | `release 12.1, V12.1.0` | 编译工具链的版本，没装 Toolkit 就没这个命令 |
| `python -c "import torch; print(torch.version.cuda)"` | PyTorch wheel **打包的** CUDA Runtime 版本 | `12.1` | 框架运行时实际用的 CUDA，可能和 nvcc 不同 |

**三者可能都不一样，且都是正常的**：

```
nvidia-smi   → CUDA Version: 12.2     （驱动支持的最高）
nvcc -V      → release 12.1           （你装的 Toolkit）
torch.version.cuda → 12.1             （PyTorch 自带的 runtime）
```

**判断规则**：
- 框架用的 CUDA Runtime 版本 ≤ 驱动支持的最高版本 → 能跑
- 框架用的 CUDA Runtime > 驱动支持的最高 → 报 `CUDA driver version is insufficient`
- 跑预编译框架（pip 装的 PyTorch）**不需要** nvcc，因为 wheel 里已经打包了 cudart + cuDNN
- 只有**自己编译 CUDA 算子**（如 flash-attn、自定义 extension）才需要 nvcc

### 4.4 易混淆点

| 易混淆 | 正解 |
|--------|------|
| "装了 CUDA Toolkit 就能跑 PyTorch" | 不一定，PyTorch wheel 自带 runtime，可能和系统 Toolkit 冲突 |
| "nvidia-smi 显示 12.2 就是装了 CUDA 12.2" | 错，那是驱动支持的最高版本，实际可能没装 Toolkit |
| "cuDNN = CUDA" | 错，cuDNN 只是 CUDA 之上的深度学习加速库，是 CUDA 的一部分生态 |
| "容器要自己装驱动" | 错，容器共享宿主机内核驱动，容器只装 Toolkit/runtime |
| "nvcc 装了 PyTorch 就能用 GPU" | 不一定，还要驱动版本够、`--gpus all` 透传、装的是 GPU 版不是 CPU 版 |

---

## 五、诊断 GPU 环境的固定顺序

### 5.1 四步诊断链路

环境出问题时，**按这个顺序查，一次只改一个变量**：

```bash
# ========== 第 1 步：驱动是否看到设备 ==========
nvidia-smi
# 看什么：
#   - 能不能输出表格（不能 = 驱动没装好 / 没重启 / GPU 掉线）
#   - Driver Version（驱动版本）
#   - CUDA Version（驱动支持的最高 CUDA，不是实际装的）
#   - GPU 列表有没有你的卡
#   - 显存占用（被别的进程占了？）

# ========== 第 2 步：编译工具链来自哪里 ==========
which nvcc
# 看什么：
#   - 有没有这个命令（没有 = 没装 Toolkit 或 PATH 没配）
#   - 来自哪里（/usr/local/cuda/bin/nvcc？conda env？容器内？）
nvcc --version
# 看什么：实际装的 Toolkit 版本
# 注意：跑预编译框架（pip 装的 torch）不需要 nvcc，这步没命令也可能正常

# ========== 第 3 步：Python 与框架来自哪里 ==========
which python
# 看什么：用的是哪个 Python（系统的？venv 的？conda 的？容器内的？）
python -c 'import sys; print(sys.executable)'
# 更可靠，which python 可能被 alias/shell function 拦截

# ========== 第 4 步：框架看到什么 ==========
python - <<'PY'
import torch
print("torch:", torch.__version__)
print("built with CUDA:", torch.version.cuda)
print("CUDA available:", torch.cuda.is_available())
print("device count:", torch.cuda.device_count())
print("device name:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A")
PY
# 看什么：
#   - torch.version.cuda：PyTorch 打包的 CUDA runtime 版本
#   - is_available()：True = 能用 GPU，False = 见下表排查
#   - device_count()：能看到几张卡
```

### 5.2 常见现象 → 优先检查表

| 现象 | 优先检查 |
|------|---------|
| `nvidia-smi` 命令不存在/失败 | 驱动没装、没重启、GPU 硬件掉线、宿主机故障 |
| `nvidia-smi` 成功但 `which nvcc` 找不到 | Toolkit 没装，或 PATH 没配 `/usr/local/cuda/bin` |
| `nvcc` 有但 `torch.cuda.is_available()` 返回 False | 装了 CPU 版 PyTorch / 驱动版本不够 / 容器没传 `--gpus all` / `CUDA_VISIBLE_DEVICES` 被设空 |
| `import torch` 失败，报缺 `.so` | 动态库搜索路径（`LD_LIBRARY_PATH`）/ wheel 和系统库 ABI 不匹配 |
| 自定义扩展编译失败 | 编译器版本（GCC）/ Toolkit 头文件 / 目标 GPU 架构（`TORCH_CUDA_ARCH_LIST`）/ C++ ABI |
| 运行时报 `libcudart.so.12: cannot open shared object file` | `LD_LIBRARY_PATH` 没包含对应路径 / 装了多个 CUDA 版本互相覆盖 |

### 5.3 完整诊断示例

**场景**：用户在容器里跑 PyTorch，`torch.cuda.is_available()` 返回 `False`，按四步链路诊断：

```bash
# 第 1 步：驱动
$ nvidia-smi
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.129.03   Driver Version: 535.129.03   CUDA Version: 12.2    |
|   0  NVIDIA A10          Off  | 00000000:00:04.0 Off |                    0 |
+-----------------------------------------------------------------------------+
# ✅ 驱动正常，GPU 在线，支持最高 CUDA 12.2

# 第 2 步：Toolkit
$ which nvcc
/usr/local/cuda/bin/nvcc
$ nvcc --version
Cuda compilation tools, release 12.1, V12.1.0
# ✅ Toolkit 装了，12.1，≤ 驱动支持的 12.2，OK

# 第 3 步：Python 来源
$ which python
/opt/conda/bin/python           # 用的是 conda 的 Python
$ python -c 'import sys; print(sys.executable)'
/opt/conda/bin/python

# 第 4 步：框架看到什么
$ python - <<'PY'
import torch
print("torch:", torch.__version__)
print("built with CUDA:", torch.version.cuda)
print("CUDA available:", torch.cuda.is_available())
print("device count:", torch.cuda.device_count())
PY
torch: 2.3.0
built with CUDA: 12.1
CUDA available: False           # ❌ 问题在这
device count: 0

# 诊断：驱动 OK、Toolkit OK、PyTorch 是 CUDA 12.1 版，但 available=False
# 优先怀疑：容器没传 --gpus all
$ echo $NVIDIA_VISIBLE_DEVICES
# 空 ← 没设置，容器看不到 GPU

# 修复：重启容器时加 --gpus all
docker run --gpus all -it my-pytorch-image
# 再次跑第 4 步 → available=True, device count=1 ✅
```

**关键原则**：四步链路走完，每一步都验证了再改下一个变量。不要一上来就"重装 PyTorch / 重装 CUDA / 重装驱动"——大多数问题都能在这四步里定位。

---

## 六、面试回答（可直接口述）

**问：venv、conda、Docker 在 AI 开发里分别解决什么问题？**

答：它们是**三个递进的隔离层次**，不是互斥的。venv（以及现代替代品 uv）只隔离 Python 包，适合纯 Python 项目；conda 多隔离一部分原生库（如 MKL 加速的 numpy），适合科学计算；Docker 隔离整个用户态，连 CUDA Toolkit、系统库都打包进去，适合跨机器复现和部署。一个项目可能同时用 uv 管 Python 包 + Docker 打包整体环境，互不冲突。

**问：uv 和 venv+pip 有什么区别？该用哪个？**

答：隔离范围一样（都只管 Python 包，不管原生库和 CUDA），但 uv 有几个优势：① 速度快 10~100 倍（Rust 写的，并行下载+全局缓存）；② 能管理 Python 版本（uv python install，venv 做不到）；③ 内置跨平台锁文件 uv.lock（venv 需要 pip-tools 额外生成）；④ uv run 不用 activate 就能跑（自动管理环境）。新项目首选 uv，uv 管不了的（原生库/CUDA Toolkit）才上 conda 或 Docker。老项目可以用 uv pip 兼容模式渐进迁移，命令和 pip 一样但快得多。

**问：nvidia-smi 显示的 CUDA 版本和 nvcc 显示的为什么不一样？**

答：因为它们显示的不是同一个东西。`nvidia-smi` 显示的是**驱动支持的最高 CUDA 兼容级别**，由驱动版本决定，不代表本机装了那个 CUDA；`nvcc --version` 显示的是**实际安装的 CUDA Toolkit 版本**。两者不同是正常的，只要实际装的 ≤ 驱动支持的最高版本就能跑。判断框架实际用的 CUDA 还要看 `torch.version.cuda`，因为 PyTorch wheel 里打包了自己的 CUDA Runtime，可能和系统 Toolkit 都不一样。

**问：GPU 容器要不要自己装 NVIDIA 驱动？**

答：不要。容器**共享宿主机内核**，内核态驱动（`nvidia.ko`）只在宿主机装一次。NVIDIA Container Toolkit 负责把宿主机的 `libcuda.so` 和 `/dev/nvidia*` 设备文件挂载进容器，容器内进程通过共享内核的驱动访问 GPU。所以容器只装 CUDA Toolkit（可选）和 cuDNN 等用户态库，驱动永远来自宿主机。

---

## 七、深入追问

1. **为什么 `python -m pip` 比 `pip` 更安全？**
   `pip` 是独立可执行文件，可能被 PATH 里的其他环境"截胡"；`python -m pip` 保证用的是当前 `python` 对应的 pip，避免"运行 A 环境的 Python 却调 B 环境的 pip"。

2. **conda env export 不加 `--from-history` 会怎样？**
   会导出所有包（包括自动装的依赖），环境文件巨大且脆。在另一台机器上 `conda env create -f` 会死扣旧版本，依赖冲突时无法自动升级。`--from-history` 只记录你显式装的包，让 conda 重新解析依赖，更鲁棒。

3. **PyTorch wheel 自带 CUDA Runtime，那还要不要装 CUDA Toolkit？**
   跑预编译的 PyTorch（`pip install torch`）**不需要** Toolkit，因为 wheel 里打包了 cudart、cuBLAS、cuDNN。但如果你要**编译自定义 CUDA 算子**（如 `flash-attn`、`xformers`、自己写的 `.cu`），就需要 nvcc 和头文件，这时要么装 Toolkit，要么用 `devel` 镜像。

4. **`CUDA_VISIBLE_DEVICES` 和 Docker `--gpus` 有什么区别？**
   `--gpus all` 是把 GPU 设备透传给容器（容器进程能看到 GPU）；`CUDA_VISIBLE_DEVICES` 是 CUDA runtime 层的过滤（进程能看到但不用某些卡）。容器内 `CUDA_VISIBLE_DEVICES=1` 表示"只用 1 号卡"，前提是 `--gpus` 已经把卡透传进来了。

5. **为什么 `environment.yml` / `requirements.txt` 不是完整环境描述？**
   它们只记录 Python 包，不含操作系统、驱动版本、内核版本、硬件架构（x86 vs ARM）、编译器版本。所以"在我这能跑在你那不能跑"很常见。真正的完整复现要 Docker 镜像（连 OS 和库一起打包），但即便如此也复现不了驱动和硬件——那部分要靠文档记录。uv.lock 比 requirements.txt 强（含 hash 和平台信息），但同样不含 OS/驱动，所以 uv.lock 也不能替代 Docker 做完整复现。

6. **uv 的全局缓存是怎么回事？多项目共享会不会冲突？**
   uv 把下载的 wheel 缓存在 `~/.cache/uv` 里，多个项目的 .venv 通过硬链接（hardlink）引用缓存，不重复占磁盘。不会冲突——每个 .venv 是独立的目录，只是底层文件指向同一份缓存。卸载某个包只是断开硬链接，不影响其他项目。这也是 uv 比 pip 快的原因之一（pip 每个 venv 各装一份，重复下载+占空间）。

---

## 八、复用判断（下次如何快速定位）

- **"能不能跑 GPU"问题** → 走第五章四步诊断链路，别一上来重装
- **"装了 CUDA 但 nvcc 找不到"** → 检查 PATH 是否包含 `/usr/local/cuda/bin`，不是没装
- **"nvidia-smi 显示 12.2 但 PyTorch 报版本不够"** → nvidia-smi 是驱动最高支持，PyTorch 用的是 wheel 里的 runtime，看 `torch.version.cuda`
- **"容器里 nvidia-smi 能用但 torch 看不到 GPU"** → 容器启动没加 `--gpus all`
- **"venv 里 pip install 装到全局了"** → 没激活 venv，或用了 `pip` 而不是 `python -m pip`
- **"跨机器复现失败"** → requirements.yml 救不了，换 Docker 镜像，并文档记录驱动版本和硬件
- **"uv 和 venv 怎么选"** → 新项目用 uv（快+锁文件+管 Python 版本），老项目 uv pip 兼容迁移，原生库/CUDA 还是 conda/Docker

---

## 九、关联笔记

- 本目录 `2. Docker与Nvidia-Docker2.md`（Docker 命令、Dockerfile、nvidia-docker2 安装）
- 本目录 `3. GPU-CUDA与cuDNN软件栈.md`（驱动/CUDA/cuDNN 安装步骤、版本兼容表、AWQ 量化）
- `python/` 目录（venv/conda 实操）
- `linux/Linux开发基本功_新人入门版.md`（环境变量、`LD_LIBRARY_PATH`、`which`、`ldd`）
- `技术工具学习索引.md`

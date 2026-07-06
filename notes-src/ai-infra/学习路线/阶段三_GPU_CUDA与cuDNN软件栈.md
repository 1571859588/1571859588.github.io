# 阶段三：GPU、CUDA、cuDNN NVIDIA 软件栈

> 来源：《完整 AI-Infra 转行落地教程》阶段三 | 周期：2 周
> 笔记类型：学习笔记 + 实操记录
> 关联：AI-Infra 和传统运维的分水岭。传统运维完全不学 CUDA，AI-Infra 的核心难点就是 NVIDIA 驱动、CUDA 版本兼容问题，**90% 大模型启动失败都是版本不匹配导致**。

---

## 一、阶段定位与目标

### 1.1 为什么这是分水岭

传统运维工程师完全不接触 CUDA。一旦你掌握了 NVIDIA 驱动 / CUDA / cuDNN 的安装和版本匹配，就从"普通运维"跨入了"AI-Infra 工程师"。

**核心痛点**：
- 90% 的大模型启动失败都是 CUDA 版本不匹配导致
- `nvidia-smi` 显示的 CUDA 版本和 `nvcc -V` 显示的可能不一样（新手必踩坑）
- 驱动向下兼容 CUDA，但不同框架要求不同 CUDA 版本

### 1.2 阶段验收标准

> 可以独立完成驱动-CUDA 版本匹配，解决 CUDA 冲突、显存 OOM（显存溢出）报错。

### 1.3 实验环境

- **云服务器**：阿里云 A10 24G 显存 GPU 实例（按需计费 1.8 元/小时，练习时开机，闲置关机）
- **操作系统**：Ubuntu 22.04

---

## 二、必学理论

### 2.1 NVIDIA 软件栈三层结构

```
应用层        PyTorch / vLLM / TGI / Transformers
                    ↓ 调用
加速层        cuDNN（神经网络加速库）
                    ↓ 依赖
计算层        CUDA（GPU 并行计算库）
                    ↓ 依赖
驱动层        NVIDIA Driver（显卡驱动）
                    ↓ 控制
硬件层        GPU 硬件（A100/A10/V100...）
```

**层级关系**：
- 驱动是最底层，必须先装
- CUDA 依赖驱动，驱动版本决定能装哪个 CUDA
- cuDNN 依赖 CUDA，是 CUDA 的神经网络加速补充
- PyTorch 等框架依赖 CUDA + cuDNN

### 2.2 NVIDIA 显卡驱动

**作用**：让操作系统能识别和控制 GPU 硬件。

**版本兼容规则**（PDF 重点）：
- 驱动**向下兼容** CUDA
- 例：535 版本驱动最高支持 CUDA 12.2
- 驱动版本 ≥ CUDA 要求的最低版本即可

**安装方式**：

```bash
# 方式一：apt 安装（推荐，简单）
sudo apt update
sudo apt install nvidia-driver-535 -y
sudo reboot                    # 重启生效

# 方式二：官方 run 文件（需要特定版本时用）
# 去 https://www.nvidia.com/drivers 下载对应版本
sudo sh NVIDIA-Linux-x86_64-535.xx.run
```

**验证**：

```bash
nvidia-smi
# 输出示例：
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.129.03   Driver Version: 535.129.03   CUDA Version: 12.2    |
# |-------------------------------+----------------------+----------------------+
# |   0  NVIDIA A10          Off  | 00000000:00:04.0 Off |                    0 |
# |  0%   35C    P0    45W / 150W |      0MiB / 23028MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+
```

> 注意 `nvidia-smi` 显示的 `CUDA Version: 12.2` 是**驱动支持的最高 CUDA 版本**，不一定是实际安装的 CUDA 版本。

### 2.3 CUDA（GPU 并行计算库）

**作用**：GPU 并行计算库，是模型运行的依赖环境。PyTorch、vLLM 等框架底层都调 CUDA。

**安装**：

```bash
# 下载（以 CUDA 12.1 为例）
wget https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_530.30.02_linux.run

# 安装（只装 toolkit，不装驱动，驱动已单独装过）
sudo sh cuda_12.1.0_530.30.02_linux.run --silent --toolkit

# 配置环境变量
echo 'export PATH=$PATH:/usr/local/cuda/bin' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda/lib64' >> ~/.bashrc
source ~/.bashrc
```

**验证**：

```bash
nvcc -V
# 输出：
# nvcc: NVIDIA (R) Cuda compiler driver
# Cuda compilation tools, release 12.1, V12.1.0
```

### 2.4 关键区分：nvidia-smi vs nvcc -V（面试必考）

这是新手最容易混淆的点，也是面试常考题。

| 命令 | 显示的是什么 | 来源 |
|------|-------------|------|
| `nvidia-smi` | **驱动支持的最高 CUDA 版本** | 驱动程序自带 |
| `nvcc -V` | **实际安装的 CUDA Toolkit 版本** | CUDA Toolkit 安装时带 |

**两者可能不一致**：
```
nvidia-smi 显示 CUDA Version: 12.2    ← 驱动支持的最高版本
nvcc -V 显示 release 12.1             ← 实际装的 CUDA Toolkit 版本
```
这是**正常的**，不是 bug。只要实际装的 CUDA 版本 ≤ 驱动支持的最高版本就行。

**版本不匹配的影响**：
- 实际 CUDA > 驱动支持的最高版本 → 模型启动失败
- CUDA 版本和 PyTorch 要求的不匹配 → `import torch` 报错或 GPU 不可用

### 2.5 cuDNN（神经网络加速库）

**作用**：NVIDIA 的深度神经网络加速库，提升大模型推理速度。没有 cuDNN，CUDA 也能跑，但慢很多。

**安装**：

```bash
# 下载（需注册 NVIDIA 账号，或用 apt 安装）
sudo apt install libcudnn8 libcudnn8-dev -y

# 验证
cat /usr/local/cuda/include/cudnn_version.h | grep CUDNN_MAJOR -A 2
# 或
dpkg -l | grep cudnn
```

### 2.6 模型量化：AWQ、GPTQ（PDF 重点）

**作用**：压缩大模型体积，降低显存占用，让单张显卡承载更大模型。

| 量化方法 | 全称 | 原理 | 特点 |
|----------|------|------|------|
| **AWQ** | Activation-aware Weight Quantization | 基于激活值感知的权重量化 | 速度快，精度损失小，**vLLM 默认推荐** |
| **GPTQ** | Generative Pre-trained Transformer Quantization | 基于二阶信息的逐层量化 | 压缩率高，但量化过程慢 |

**量化效果示例（PDF 原文）**：

```
Qwen-14B 原始（FP16）：
  显存占用 ≈ 28GB（A10 24G 装不下）

Qwen-14B AWQ 4-bit 量化后：
  显存占用 ≈ 10GB（A10 24G 轻松承载）

压缩比：28GB → 10GB，约 3.5 倍压缩
```

**量化对比**：

| 维度 | AWQ | GPTQ |
|------|-----|------|
| 量化速度 | 快 | 慢（逐层计算） |
| 推理速度 | 快 | 中 |
| 精度损失 | 小 | 小 |
| vLLM 支持 | ✅ 原生 | ✅ 支持 |
| 适用场景 | **生产部署首选** | 研究对比 |

---

## 三、实操任务

### 3.1 在 GPU 云服务器上安装驱动 + CUDA 12.1 + cuDNN

```bash
# === 1. 安装 NVIDIA 驱动 ===
sudo apt update
sudo apt install nvidia-driver-535 -y
sudo reboot

# 重启后验证
nvidia-smi
# 确认看到 GPU 信息

# === 2. 安装 CUDA 12.1 ===
wget https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_530.30.02_linux.run
sudo sh cuda_12.1.0_530.30.02_linux.run --silent --toolkit

# 配置环境变量
echo 'export PATH=$PATH:/usr/local/cuda/bin' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda/lib64' >> ~/.bashrc
source ~/.bashrc

# 验证
nvcc -V
# 确认 release 12.1

# === 3. 安装 cuDNN ===
sudo apt install libcudnn8 libcudnn8-dev -y

# 验证
dpkg -l | grep cudnn
```

### 3.2 安装 PyTorch 验证 GPU 调用

```bash
# 安装 PyTorch（对应 CUDA 12.1）
pip install torch --index-url https://download.pytorch.org/whl/cu121

# 验证
python3 -c "import torch; print(torch.cuda.is_available())"
# 返回 True 即为成功
```

**PDF 验证代码**：

```python
import torch

print(torch.cuda.is_available())        # True
print(torch.cuda.device_count())        # GPU 数量
print(torch.cuda.get_device_name(0))    # NVIDIA A10
```

### 3.3 实操 AWQ 4-bit 量化

```bash
# 下载 Qwen-14B 模型
huggingface-cli download Qwen/Qwen1.5-14B --local-dir /models/Qwen-14B

# 用 AutoAWQ 量化
pip install autoawq
```

```python
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer

model_path = "/models/Qwen-14B"
quant_path = "/models/Qwen-14B-AWQ"

# 量化配置
quant_config = {
    "zero_point": True,
    "q_group_size": 128,
    "w_bit": 4,                    # 4-bit 量化
}

# 加载模型
model = AutoAWQForCausalLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

# 执行量化
model.quantize(quant_config)

# 保存量化后的模型
model.save_quantized(quant_path)
tokenizer.save_pretrained(quant_path)

print(f"量化完成，保存到 {quant_path}")
```

**验证显存占用**：

```bash
# 查看量化后模型文件大小
du -sh /models/Qwen-14B        # 原始 ~28GB
du -sh /models/Qwen-14B-AWQ    # 量化后 ~10GB
```

---

## 四、版本兼容速查表

### 4.1 驱动 ↔ CUDA 对照

| 驱动版本 | 支持的最高 CUDA | 推荐场景 |
|----------|-----------------|----------|
| 535.x | 12.2 | CUDA 12.0/12.1/12.2 |
| 525.x | 12.0 | CUDA 11.8/12.0 |
| 520.x | 11.8 | CUDA 11.7/11.8 |

### 4.2 PyTorch ↔ CUDA 对照

| PyTorch 版本 | 支持 CUDA | 安装命令 |
|--------------|-----------|----------|
| 2.3+ | 11.8 / 12.1 | `pip install torch --index-url .../whl/cu121` |
| 2.0-2.2 | 11.7 / 11.8 | `pip install torch --index-url .../whl/cu118` |
| 1.13 | 11.6 / 11.7 | `pip install torch --index-url .../whl/cu117` |

### 4.3 vLLM ↔ CUDA 对照

| vLLM 版本 | 要求 CUDA | 备注 |
|-----------|-----------|------|
| 0.5+ | 12.1 | 推荐 |
| 0.3-0.4 | 11.8 | 旧版 |

---

## 五、常见报错速查

| 报错 | 原因 | 解决 |
|------|------|------|
| `CUDA out of memory` | 显存不足 | 量化模型 / 减小 batch / 关闭其他占用 GPU 的进程 |
| `torch.cuda.is_available()` 返回 False | CUDA 未装或版本不匹配 | 检查 `nvcc -V` 与 PyTorch 要求的 CUDA 版本 |
| `nvidia-smi: command not found` | 驱动未装或未重启 | `sudo apt install nvidia-driver-535 && reboot` |
| `CUDA driver version is insufficient` | 驱动太旧，不支持装的 CUDA | 升级驱动 |
| `libcuda.so not found` | 驱动库路径问题 | `sudo ldconfig` 或检查 `/usr/lib/x86_64-linux-gnu/libcuda.so` |
| 量化后精度严重下降 | 量化配置不对 | 调 `q_group_size`，或换 GPTQ 对比 |

---

## 六、验收标准

> 可以独立完成驱动-CUDA 版本匹配，解决 CUDA 冲突、显存 OOM 报错。

**自测清单**：

- [ ] 能正确安装 NVIDIA 驱动并用 `nvidia-smi` 验证
- [ ] 能区分 `nvidia-smi` 和 `nvcc -V` 显示的 CUDA 版本含义
- [ ] 能安装 CUDA 12.1 + cuDNN 并配置环境变量
- [ ] 能用 PyTorch 验证 GPU 可用（`torch.cuda.is_available()` 返回 True）
- [ ] 能用 AWQ 4-bit 量化 14B 模型，显存从 28GB 降到 10GB
- [ ] 能排查 CUDA 版本不匹配导致的启动失败

---

## 七、关联笔记

- `pytorch/PyTorch常见操作速查.md`（PyTorch 基础）
- `pytorch/多机多卡训练与部署笔记.md`（分布式训练）
- 本目录 `阶段二_Docker与Nvidia-Docker2.md`（前置：容器化）
- 本目录 `阶段四_Kubernetes与AI集群.md`（后置：K8s 调度 GPU）
- 本目录 `阶段五_大模型推理部署技术栈.md`（后置：用 CUDA 跑 vLLM）
- `技术工具学习索引.md`

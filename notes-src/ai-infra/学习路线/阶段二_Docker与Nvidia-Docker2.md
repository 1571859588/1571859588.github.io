# 阶段二：Docker + Nvidia-Docker2

> 来源：《完整 AI-Infra 转行落地教程》阶段二 | 周期：1 周
> 笔记类型：学习笔记 + 实操记录
> 关联：AI 环境隔离核心。nvidia-docker2 是 AI-Infra 独有技术，区分传统运维和 AI-Infra 工程师的第一道门槛。

---

## 一、阶段定位与目标

### 1.1 为什么 AI-Infra 必须学 Docker

传统 Docker 用来隔离软件环境；**nvidia-docker2 是 AI-Infra 独有的技术**，可以让 Docker 容器调用宿主机 GPU 显卡，解决不同大模型 CUDA、Python 版本互相冲突的问题。

**典型冲突场景**：
```
模型 A 需要 CUDA 11.8 + Python 3.9
模型 B 需要 CUDA 12.1 + Python 3.11
模型 C 需要 PyTorch 2.0
模型 D 需要 PyTorch 2.3

如果都装在宿主机 → 版本地狱，一个崩全崩
用 Docker → 每个模型一个容器，互不干扰
```

### 1.2 阶段验收标准

> 可以使用容器隔离不同版本 CUDA 环境，一键启停大模型服务。

### 1.3 核心验证命令（PDF 原文）

```bash
# 验证容器是否可以调用 GPU
docker run --rm --gpus all nvidia/cuda:12.1-base nvidia-smi
# 如果在容器内看到 GPU 信息输出，说明配置成功
```

---

## 二、必学理论

### 2.1 Docker 核心概念

| 概念 | 类比 | 说明 |
|------|------|------|
| **镜像（Image）** | 程序安装包 | 只读模板，包含运行环境（如 `nvidia/cuda:12.1-base`） |
| **容器（Container）** | 运行中的程序 | 镜像的实例，可启停删除 |
| **数据卷（Volume）** | 外接硬盘 | 持久化数据，容器删了数据还在 |
| **端口映射** | 端口转发 | `-p 8000:8000` 把容器端口映射到宿主机 |
| **Dockerfile** | 安装脚本 | 描述如何从基础镜像构建自定义镜像 |

#### 核心命令速查

```bash
# 镜像管理
docker pull nvidia/cuda:12.1-base      # 拉取镜像
docker images                          # 查看本地镜像
docker rmi <image_id>                  # 删除镜像

# 容器管理
docker run -d --name vllm -p 8000:8000 vllm/vllm:latest   # 后台运行
docker ps                              # 查看运行中的容器
docker ps -a                           # 查看所有容器（含停止的）
docker stop vllm                       # 停止
docker start vllm                      # 启动已存在的容器
docker restart vllm                    # 重启
docker rm vllm                         # 删除容器（必须先 stop）
docker logs -f vllm                    # 查看日志（实时跟踪）

# 进入容器
docker exec -it vllm bash              # 进入容器交互终端

# 容器内执行命令
docker exec vllm nvidia-smi            # 在容器里跑 nvidia-smi
```

### 2.2 Dockerfile 编写

```dockerfile
# 基于 CUDA 12.1 镜像
FROM nvidia/cuda:12.1.0-base-ubuntu22.04

# 安装 Python 和依赖
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install vllm transformers

# 复制模型配置
COPY config.yaml /app/config.yaml

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["vllm", "serve", "--model", "Qwen/Qwen2-7B", "--port", "8000"]
```

```bash
# 构建镜像
docker build -t my-vllm:latest .

# 运行（带 GPU）
docker run -d --gpus all --name vllm -p 8000:8000 my-vllm:latest
```

### 2.3 docker-compose：多容器编排

当大模型服务需要多个组件（模型 + 向量数据库 + API 网关）时，用 docker-compose 一键拉起。

```yaml
# docker-compose.yml
version: '3.8'

services:
  vllm:
    image: vllm/vllm:latest
    runtime: nvidia                  # 关键：用 nvidia runtime
    environment:
      - NVIDIA_VISIBLE_DEVICES=all   # 容器可见所有 GPU
    ports:
      - "8000:8000"
    volumes:
      - ./models:/models             # 挂载模型权重
    command: --model /models/Qwen-14B --port 8000
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  milvus:
    image: milvusdb/milvus:latest
    ports:
      - "19530:19530"
    volumes:
      - ./milvus_data:/var/lib/milvus

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - vllm
```

```bash
# 一键启停
docker-compose up -d                 # 后台启动全部服务
docker-compose down                  # 停止并删除全部
docker-compose logs -f vllm          # 看某服务日志
docker-compose restart vllm          # 只重启某个服务
```

### 2.4 nvidia-container-toolkit / nvidia-docker2（AI-Infra 核心）

#### 普通 Docker vs nvidia-docker2

| 维度 | 普通 Docker | nvidia-docker2 |
|------|-------------|----------------|
| 容器能用的资源 | CPU、内存、磁盘 | **+ GPU** |
| 适用场景 | Web 服务、数据库 | **大模型推理、训练** |
| 容器内 nvidia-smi | 报错找不到 | **正常显示 GPU** |
| 区分传统运维 vs AI-Infra | - | **第一道门槛** |

#### 工作原理

```
宿主机：
  NVIDIA Driver ←→ GPU 硬件
       ↑
  nvidia-container-toolkit（注入 GPU 设备到容器）
       ↑
  Docker 容器：
    nvidia-smi 能看到 GPU
    CUDA 程序能调用 GPU
```

nvidia-container-toolkit 在容器启动时，把宿主机的 GPU 设备文件（`/dev/nvidia*`）和驱动库挂载进容器，让容器内的程序能调用 GPU。

#### 版本说明

- **nvidia-docker2**：老版本名称（Docker 19.03 之前）
- **nvidia-container-toolkit**：新版本名称（Docker 19.03+，推荐）
- 两者功能一样，新环境一律用 nvidia-container-toolkit

---

## 三、实操步骤（完整流程）

### 3.1 在 Ubuntu 22.04 安装 Docker

```bash
# 1. 卸载旧版
sudo apt remove docker docker-engine docker.io containerd runc

# 2. 安装依赖
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# 3. 添加 Docker 官方 GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 4. 添加 Docker 源
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. 安装
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 6. 让当前用户免 sudo 使用 docker
sudo usermod -aG docker $USER
newgrp docker                       # 立即生效（或重新登录）

# 7. 验证
docker run hello-world
```

### 3.2 安装 NVIDIA 容器工具包（nvidia-container-toolkit）

```bash
# 1. 添加 NVIDIA 源
distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
      && curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
      && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# 2. 安装
sudo apt update
sudo apt install -y nvidia-container-toolkit

# 3. 配置 Docker 使用 nvidia runtime
sudo nvidia-ctk runtime configure --runtime=docker

# 4. 重启 Docker
sudo systemctl restart docker
```

### 3.3 验证容器调用 GPU（PDF 核心验证命令）

```bash
# 拉取 NVIDIA 官方 CUDA 镜像
docker pull nvidia/cuda:12.1-base

# 在容器内执行 nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.1-base nvidia-smi
```

**成功标志**：容器内输出 GPU 信息表格（显卡型号、显存、驱动版本），说明容器成功识别 GPU。

**参数解释**：
- `--rm`：容器退出后自动删除（临时测试用）
- `--gpus all`：把所有 GPU 暴露给容器（关键参数）
- `nvidia/cuda:12.1-base`：NVIDIA 官方 CUDA 镜像
- `nvidia-smi`：在容器内执行的命令

### 3.4 用 docker-compose 部署 Ollama 轻量大模型

```yaml
# docker-compose.yml
version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
    ports:
      - "11434:11434"
    volumes:
      - ./ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

```bash
# 启动
docker-compose up -d

# 拉取并运行 Qwen 模型
docker exec -it ollama-ollama-1 ollama run qwen:7b

# 测试 API
curl http://localhost:11434/api/generate -d '{
  "model": "qwen:7b",
  "prompt": "你好"
}'
```

---

## 四、数据卷挂载详解（大模型场景）

```bash
# 挂载模型权重（避免每个容器重复下载几十 GB 的模型）
docker run -v /host/models:/container/models ...

# 挂载类型
-v /host/path:/container/path          # 绑定挂载（指定宿主机路径）
-v my_volume:/container/path           # 命名卷（Docker 管理）
--mount type=bind,source=/host,dst=/container   # 推荐写法（更明确）
```

**大模型典型挂载**：

| 宿主机路径 | 容器路径 | 用途 |
|------------|----------|------|
| `/data/models/Qwen-14B` | `/models/Qwen-14B` | 模型权重 |
| `/data/hf_cache` | `/root/.cache/huggingface` | HuggingFace 缓存 |
| `/data/logs` | `/app/logs` | 应用日志 |
| `/data/config` | `/app/config` | 配置文件 |

---

## 五、常见问题速查

| 问题 | 原因 | 解决 |
|------|------|------|
| `docker: Error response from daemon: could not select device driver` | nvidia-container-toolkit 没装或没配 | 按 3.2 重装 + `nvidia-ctk runtime configure` |
| 容器内 `nvidia-smi` 报 command not found | 用了非 CUDA 镜像 | 换成 `nvidia/cuda:xx-base` 镜像 |
| 容器内 `nvidia-smi` 报 unable to determine device | `--gpus` 参数没加 | `docker run --gpus all ...` |
| `docker-compose` 找不到命令 | 老版本 | 用 `docker compose`（无横杠，新版内置） |
| 权限拒绝 `permission denied` | 用户不在 docker 组 | `sudo usermod -aG docker $USER && newgrp docker` |
| 磁盘满 | 镜像/容器太多 | `docker system prune -a` 清理（⚠️ 会删未使用的镜像） |

---

## 六、验收标准

> 可以使用容器隔离不同版本 CUDA 环境，一键启停大模型服务。

**自测清单**：

- [ ] 能用 Dockerfile 构建自定义镜像
- [ ] 能用 `--gpus all` 让容器调用 GPU
- [ ] 能用 docker-compose 编排多容器服务
- [ ] 能用数据卷挂载模型权重
- [ ] 能排查容器内 GPU 不可用的问题
- [ ] 能用 `docker logs` 排查服务启动失败

---

## 七、关联笔记

- `devops/Docker学习笔记.md`（Docker 基础详细笔记）
- 本目录 `阶段一_Linux网络与Shell脚本.md`（前置）
- 本目录 `阶段三_GPU_CUDA与cuDNN软件栈.md`（后置，CUDA 详细安装）
- `技术工具学习索引.md`

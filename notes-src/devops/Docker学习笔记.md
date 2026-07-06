# Docker 学习笔记：从一个 Python 项目搞懂 Docker

> 更新时间：2026-06-28 | 适合人群：没用过 Docker、想快速上手的开发者

## 一句话结论

Docker 解决的核心问题是"在我机器上能跑，换一台就不行"。它把应用 + 所有依赖（Python 版本、库、系统工具）打包成一个"镜像"，任何人拿到这个镜像，一行命令就能跑起来，不需要自己装任何东西。

---

## 第一章：为什么需要 Docker？

### 你可能遇到过的场景

你写了一个 Python 项目，用 FastAPI 做后端，依赖 PostgreSQL 数据库，还用到了 Redis 做缓存。本地调通了，很开心。然后：

- 同事 clone 了你的代码，跑不起来——他的 Python 版本不对、缺了几个库、PostgreSQL 配置不一样。
- 你花了两小时帮他配环境，终于跑起来了。换一台服务器部署，又得重来一遍。
- 线上用的 Linux，你本地是 Windows，有些库行为不一样，部署上去有 bug。

**传统方式**：写一份 README，列出所有依赖、版本、安装步骤、环境变量……每次换机器都手动操作一遍，祈祷不出错。

**Docker 方式**：写一个 Dockerfile 描述环境，构建一个镜像。不管在哪台机器上，只要有 Docker，一条命令就能运行，环境完全一致。

### 一个类比

把 Docker 想象成"搬家时把整个房间打包进集装箱"。你不只是搬走了家具（代码），还搬走了墙纸、水电管线、甚至空气（Python 运行时、系统库、环境变量、配置文件）。到了新地方，打开集装箱，一切和原来一模一样。

---

## 第二章：三个核心概念（只记这三个就够入门）

**镜像（Image）**：一个打包好的"快照"，包含运行应用所需的一切。它是只读的，不会变。类比：安装光盘、App 的安装包。

**容器（Container）**：镜像跑起来之后的"活体"。你可以在同一个镜像上启动多个容器（就像同一个安装包可以装出多个实例）。容器停止后，里面的改动不会写回镜像。类比：安装好的软件正在运行的那个进程。

**Dockerfile**：一个文本文件，描述"怎么制作镜像"。你在里面写清楚：用什么基础系统、装什么依赖、复制什么代码、启动什么命令。类比：一份菜谱，照着做就能做出同一道菜。

它们的关系：

```
Dockerfile（菜谱）  →  docker build  →  镜像（做好的菜）  →  docker run  →  容器（端上桌在吃的菜）
```

---

## 第三章：安装 Docker

### Windows 安装（最常见）

1. 下载 Docker Desktop：https://www.docker.com/products/docker-desktop/
2. 安装前确保你的电脑开启了 WSL2（Windows Subsystem for Linux）。在 PowerShell（管理员）里运行：

```powershell
wsl --install
```

3. 安装完成后重启，Docker Desktop 会自动启动。打开终端验证：

```bash
docker --version
# 应该输出类似：Docker version 24.0.7, build afdd6e0

docker run hello-world
# 应该输出一段欢迎信息，说明安装成功
```

**常见问题**：

- 报错"WSL2 is not installed"→ 运行 `wsl --update` 然后重启。
- 报错"Hardware assisted virtualization is not enabled"→ 需要进 BIOS 开启 Intel VT-x 或 AMD-V（大部分电脑默认是开的）。
- 启动很慢 → Docker Desktop 第一次启动要拉取一些基础镜像，等几分钟就好。

### Linux 安装（Ubuntu 为例）

```bash
# 添加 Docker 官方源（比系统自带的源更新）
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 验证
sudo docker --version
sudo docker run hello-world
```

### macOS 安装

下载 Docker Desktop for Mac（区分 Intel 和 Apple Silicon 芯片），安装后打开就行，和 Windows 体验类似。

### 关于 sudo 的问题（Linux 用户必看）

在 Linux 上，Docker 默认需要 `sudo` 权限才能运行，因为 Docker 守护进程需要访问内核功能。每次敲 `sudo docker xxx` 很烦，可以把自己加到 `docker` 用户组：

```bash
# 把当前用户加入 docker 组
sudo usermod -aG docker $USER

# 必须重新登录（或重启）才生效！
# 验证：
newgrp docker   # 或者退出终端重新打开
docker ps       # 不再需要 sudo
```

**注意**：加入 docker 组 ≈ 拥有 root 权限。因为用户可以通过 `docker run -v /:/host` 挂载宿主机整个文件系统，在容器内就能以 root 身份读写宿主机所有文件。所以只给你信任的人加 docker 组。

**Windows / macOS 上不需要 sudo**，Docker Desktop 自动处理了权限问题。

---

## 第四章：实战——把一个 Python 项目装进 Docker

### 假设你的项目长这样

```
my-fastapi-app/
├── app.py                # FastAPI 主程序
├── requirements.txt      # Python 依赖
├── config.yaml           # 配置文件
└── data/                 # 一些数据文件
    └── model.pkl
```

`requirements.txt` 内容：

```
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
redis==5.0.1
psycopg2-binary==2.9.9
pyyaml==6.0.1
```

`app.py` 核心代码：

```python
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def hello():
    return {"message": "Hello from Docker!"}

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 第一步：写 Dockerfile

在项目根目录（`my-fastapi-app/` 下）创建一个文件叫 `Dockerfile`（没有后缀）：

```dockerfile
# ============ 第1行：从哪个"地基"开始 ============
# python:3.11-slim 是一个官方精简镜像，只有 Python + 最小系统库，约 120MB
# 不要用 python:3.11（完整版约 900MB），也不要用 python:latest（版本不可控）
FROM python:3.11-slim

# ============ 第2行：设置工作目录 ============
# 之后所有命令都在 /app 目录下执行，相当于 cd /app
WORKDIR /app

# ============ 第3-4行：先复制依赖文件并安装 ============
# 为什么要单独 COPY requirements.txt？因为 Docker 有缓存机制：
# 如果 requirements.txt 没变，这一层会直接用缓存，不用重新 pip install，节省时间
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ============ 第5行：复制项目代码 ============
# 把当前目录（.）的所有文件复制到容器的 /app 目录
COPY . .

# ============ 第6行：声明端口（仅文档作用）============
# 告诉使用者"这个应用用 8000 端口"，但不会自动映射
# 实际映射靠 docker run -p
EXPOSE 8000

# ============ 第7行：容器启动时执行什么命令 ============
CMD ["python", "app.py"]
```

**为什么要一行一行写？** Dockerfile 的每一行都会生成一个"层"（Layer），层是缓存单位。把不常变的内容（装依赖）放前面，常变的内容（复制代码）放后面，这样改代码重新构建时，装依赖那层会命中缓存，不用等 pip install。

### 第二步：创建 .dockerignore

在项目根目录创建 `.dockerignore`，作用类似 `.gitignore`，告诉 Docker 构建时不要把这些文件复制进镜像：

```
__pycache__/
*.pyc
.git/
.gitignore
.env
*.md
.vscode/
data/*.log
```

不加这个文件的话，`.git/` 目录（可能几百 MB 的历史记录）也会被打包进去，镜像会很大而且构建很慢。

### 第三步：构建镜像

打开终端，进入项目目录，运行：

```bash
# -t 是给镜像起个名字和版本标签
# 最后的 . 表示"当前目录"是构建上下文
docker build -t my-fastapi-app:v1.0 .
```

你会看到类似输出：

```
[+] Building 45.3s (8/8) FINISHED
 => [1/4] FROM docker.io/library/python:3.11-slim           12.1s
 => [2/4] WORKDIR /app                                       0.1s
 => [3/4] COPY requirements.txt .                            0.0s
 => [4/4] RUN pip install --no-cache-dir -r requirements.txt 28.5s
 => [5/4] COPY . .                                           0.2s
 => exporting to image                                       0.5s
 => => naming to docker.io/library/my-fastapi-app:v1.0
```

第一次构建要下载基础镜像 + 安装依赖，比较慢。之后再构建（只要 requirements.txt 没变），装依赖那一步会秒过。

查看构建好的镜像：

```bash
docker images
# REPOSITORY          TAG       IMAGE ID       CREATED          SIZE
# my-fastapi-app      v1.0      abc123def456   30 seconds ago   285MB
```

### 第四步：运行容器

```bash
docker run -d \
  --name myapp \
  -p 8080:8000 \
  my-fastapi-app:v1.0
```

逐个参数解释：

| 参数 | 含义 |
|------|------|
| `-d` | 后台运行（detached），不占用当前终端 |
| `--name myapp` | 给容器起个名字，方便后面用名字操作它 |
| `-p 8080:8000` | 把宿主机的 8080 端口映射到容器内的 8000 端口 |
| `my-fastapi-app:v1.0` | 用哪个镜像启动 |

现在在浏览器打开 `http://localhost:8080`，你应该看到：

```json
{"message": "Hello from Docker!"}
```

**恭喜，你的应用已经在 Docker 里跑起来了。**

### 第五步：常用操作

```bash
# 查看正在运行的容器
docker ps
# CONTAINER ID  IMAGE                 STATUS        PORTS                    NAMES
# abc123        my-fastapi-app:v1.0   Up 2 minutes  0.0.0.0:8080->8000/tcp   myapp

# 查看日志（应用里的 print 和日志都在这）
docker logs myapp
docker logs -f myapp       # -f 持续跟踪，类似 tail -f

# 进入容器内部（像一个虚拟机一样进去看看）
docker exec -it myapp /bin/bash
# 进去之后你可以：
#   ls -la          看看文件在哪
#   python --version 看看 Python 版本
#   pip list         看看装了什么包
#   cat config.yaml  看看配置文件
#   exit             退出容器

# 停止容器
docker stop myapp

# 启动已经停止的容器
docker start myapp

# 删除容器（必须先停止）
docker rm myapp

# 删除镜像
docker rmi my-fastapi-app:v1.0
```

---

## 第五章：实际项目中常见的进阶场景

### 场景一：我的应用需要读本地文件 / 写日志

如果应用在运行时需要读写文件（比如写入日志、读取配置文件），用"卷挂载"（Volume Mount）把宿主机的目录映射到容器内：

```bash
docker run -d --name myapp \
  -p 8080:8000 \
  -v ./logs:/app/logs \
  -v ./config.yaml:/app/config.yaml:ro \
  my-fastapi-app:v1.0
```

| 挂载方式 | 含义 |
|---------|------|
| `-v ./logs:/app/logs` | 宿主机的 `./logs` 目录 ↔ 容器内的 `/app/logs`，双向同步 |
| `-v ./config.yaml:/app/config.yaml:ro` | 只读挂载（`:ro`），容器内不能改这个文件 |

这样日志会写到你本地的 `logs/` 目录，容器删了日志还在。

### 场景二：我的应用需要连数据库（Docker Compose）

真实项目通常不止一个服务。比如你的应用需要 PostgreSQL + Redis。手动一个个 `docker run` 太麻烦，用 Docker Compose 一个文件搞定：

在项目根目录创建 `docker-compose.yml`：

```yaml
services:
  web:
    build: .                          # 用当前目录的 Dockerfile 构建
    ports:
      - "8080:8000"
    environment:                      # 通过环境变量传配置
      - DATABASE_URL=postgresql://myuser:mypass@db:5432/mydb
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    volumes:
      - ./logs:/app/logs              # 日志持久化

  db:
    image: postgres:15                # 直接用官方镜像
    environment:
      - POSTGRES_USER=myuser
      - POSTGRES_PASSWORD=mypass
      - POSTGRES_DB=mydb
    volumes:
      - pgdata:/var/lib/postgresql/data  # 数据库数据持久化

  cache:
    image: redis:7-alpine             # Redis 用 alpine 版本更小

volumes:
  pgdata:                             # 声明一个由 Docker 管理的卷
```

然后一条命令启动所有服务：

```bash
# 构建并启动所有服务
docker compose up -d

# 查看状态
docker compose ps

# 查看所有服务日志
docker compose logs -f

# 只重新构建 web 服务（比如你改了代码）
docker compose up -d --build web

# 停止并清理所有服务
docker compose down

# 停止并清理（包括数据库数据）
docker compose down -v
```

**一个关键点**：在 Compose 里，服务之间用服务名互相访问。所以 web 容器访问数据库的地址不是 `localhost`，而是 `db`（服务名）。Docker Compose 会自动创建一个内部网络，所有服务都在这个网络里，互相可以通过名字解析。

### 场景三：开发时想改代码立即生效（热更新）

上面那种方式，每次改代码都要重新 build 镜像才能看到效果。开发时可以用卷挂载把代码目录直接映射进去：

```yaml
services:
  web:
    build: .
    ports:
      - "8080:8000"
    volumes:
      - .:/app                        # 把当前目录挂载到容器的 /app
    command: uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

这样你改本地代码，容器内会立即同步，配合 `--reload` 参数，uvicorn 会自动重启。不用反复 build。

**注意**：这种方式只适合开发，不要用在生产环境。

---

## 第六章：把镜像给别人用

### 方式一：导出为文件（最简单，适合小团队内部分享）

```bash
# 你这边：把镜像保存成一个 .tar 文件
docker save -o my-fastapi-app-v1.0.tar my-fastapi-app:v1.0

# 把 .tar 文件发给同事（微信、邮件、U盘都行）

# 同事那边：从 .tar 文件加载镜像
docker load -i my-fastapi-app-v1.0.tar

# 然后直接运行
docker run -d --name myapp -p 8080:8000 my-fastapi-app:v1.0
```

这种方式的好处是零门槛，不需要任何账号和网络。缺点是文件可能比较大（几百 MB），而且没有版本管理。

### 方式二：推送到镜像仓库（推荐，适合团队协作）

Docker Hub 是最常用的公共仓库，注册一个账号就能免费用。

```bash
# 1. 登录
docker login
# 输入用户名和密码

# 2. 给镜像打标签（格式：用户名/镜像名:版本）
docker tag my-fastapi-app:v1.0 yourusername/my-fastapi-app:v1.0

# 3. 推送
docker push yourusername/my-fastapi-app:v1.0

# 同事那边：拉取并运行
docker pull yourusername/my-fastapi-app:v1.0
docker run -d --name myapp -p 8080:8000 yourusername/my-fastapi-app:v1.0
```

国内常用的镜像仓库还有阿里云容器镜像服务（个人免费）和腾讯云容器镜像服务。企业内通常自建 Harbor。

### 方式三：直接给 Dockerfile + 代码（最透明）

把 Dockerfile 和 `.dockerignore` 提交到 Git 仓库里。同事 clone 代码后自己 build：

```bash
git clone https://github.com/you/my-fastapi-app.git
cd my-fastapi-app
docker build -t my-fastapi-app:v1.0 .
docker run -d --name myapp -p 8080:8000 my-fastapi-app:v1.0
```

或者如果项目有 `docker-compose.yml`，更简单：

```bash
git clone https://github.com/you/my-fastapi-app.git
cd my-fastapi-app
docker compose up -d
# 搞定，直接访问 localhost:8080
```

这是最推荐的方式——代码和环境描述都在版本控制里，任何人、任何时候都能一键复现。

---

## 第七章：跨平台注意事项（Windows ↔ Linux）

### 路径问题

这是跨平台最容易踩的坑。

Windows 路径用反斜杠 `C:\Users\lenck\project`，Linux 用正斜杠 `/home/user/project`。在 Docker 命令中统一用正斜杠：

```bash
# Windows 上（PowerShell 或 CMD 都可以）
docker run -v C:\Users\lenck\project\logs:/app/logs myapp
# 或者用正斜杠（推荐，兼容性更好）
docker run -v C:/Users/lenck/project/logs:/app/logs myapp

# Linux 上
docker run -v /home/user/project/logs:/app/logs myapp
```

如果你用 Docker Compose，卷挂载直接用相对路径就不用操心平台差异：

```yaml
volumes:
  - ./logs:/app/logs    # 相对路径，Windows 和 Linux 都能用
```

### 换行符问题

Windows 的换行符是 `\r\n`（CRLF），Linux 是 `\n`（LF）。如果你写的 shell 脚本（比如 `entrypoint.sh`）在 Windows 上用了 CRLF，放到 Linux 容器里会报错：

```
/bin/bash^M: bad interpreter: No such file or directory
```

**解决办法**：
- 编辑器里设置换行符为 LF（VS Code 右下角可以切换）。
- 或者在 Dockerfile 里转换：`RUN sed -i 's/\r$//' entrypoint.sh`

### 端口映射

端口映射在所有平台上行为一致。`-p 8080:8000` 在 Windows、Linux、macOS 上都是把宿主机 8080 映射到容器 8000，访问 `localhost:8080` 就行。

**注意**：Windows 上如果 8080 端口被其他程序占用，会报端口冲突。换个端口就行：`-p 9090:8000`。

### 文件权限

在 Linux 上，容器内创建的文件默认属主是 root，映射到宿主机后你的普通用户可能没有权限读写：

```bash
# 在 Linux 上遇到权限问题
ls -la logs/
# -rw-r--r-- 1 root root 1234 Jun 28 10:00 app.log  ← 属主是 root

# 解决办法：运行时指定用户
docker run --user $(id -u):$(id -g) ... myapp

# 或者在 Dockerfile 中创建非 root 用户
```

**Windows 和 macOS 上不存在这个问题**，Docker Desktop 自动处理了文件权限映射。

---

## 第八章：常用命令速查表

```bash
# ====== 镜像 ======
docker images                          # 查看本地所有镜像
docker build -t 名字:版本 .             # 构建镜像
docker rmi 镜像名:版本                   # 删除镜像
docker image prune -f                  # 清理无用的悬空镜像
docker history 镜像名:版本              # 查看镜像每层做了什么

# ====== 容器 ======
docker ps                              # 查看运行中的容器
docker ps -a                           # 查看所有容器（包括已停止的）
docker run -d --name 名字 -p 端口 镜像  # 后台运行容器
docker stop 名字                        # 停止容器
docker start 名字                       # 启动已停止的容器
docker rm 名字                          # 删除容器
docker logs -f 名字                     # 跟踪查看日志
docker exec -it 名字 /bin/bash          # 进入容器
docker cp 名字:/容器路径 ./本地路径       # 从容器复制文件出来
docker inspect 名字                     # 查看容器详细信息

# ====== Compose ======
docker compose up -d                   # 启动所有服务
docker compose up -d --build           # 重新构建并启动
docker compose down                    # 停止并删除
docker compose down -v                 # 停止并删除（含数据卷）
docker compose logs -f                 # 查看所有服务日志
docker compose ps                      # 查看服务状态

# ====== 清理 ======
docker system prune                    # 清理停止的容器、无用网络和悬空镜像
docker system prune -a                 # 更激进：连没用的镜像也一起删
docker volume prune                    # 清理未使用的卷
```

---

## 第九章：权限与安全（进阶但重要）

### 容器内默认是 root，这有什么风险？

Docker 容器内默认以 root 身份运行进程。如果你的应用有漏洞，攻击者可能利用 root 权限做更多坏事。生产环境建议用非 root 用户：

```dockerfile
FROM python:3.11-slim

# 创建一个普通用户
RUN adduser --disabled-password appuser

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制文件并把所有权给 appuser
COPY --chown=appuser:appuser . .

# 之后所有命令都以 appuser 身份执行
USER appuser

EXPOSE 8000
CMD ["python", "app.py"]
```

### Linux 上的 docker 组安全考量

前面说过，加入 docker 组 ≈ root 权限。如果你在一台多人共用的服务器上，不建议随便给人 docker 组权限。替代方案：

- **Rootless Docker**：让每个用户以非 root 身份运行自己的 Docker daemon。安装方式：`dockerd-rootless-setuptool.sh install`。限制是不能绑定 1024 以下端口、不支持 privileged 模式。
- **Podman**：Red Hat 推出的 Docker 替代品，天生无 daemon、无 root，命令和 Docker 几乎一模一样。

### Dockerfile 安全清单

| 做法 | 好 / 坏 | 原因 |
|------|---------|------|
| `FROM python:3.11-slim` | 好 | 镜像小，攻击面小 |
| `FROM ubuntu:latest` | 坏 | 版本不可控，镜像大 |
| `USER appuser` | 好 | 非 root 运行 |
| 不加 `USER` | 坏 | 默认 root，有安全风险 |
| `.dockerignore` 排除 `.env` | 好 | 不会把密钥打包进镜像 |
| `COPY . .` 不加 `.dockerignore` | 坏 | 可能泄露 `.env`、`.git` 等敏感文件 |
| 固定版本号 `python:3.11` | 好 | 可复现 |
| `python:latest` | 坏 | 每次拉取可能不同版本 |

---

## 附录：面试常见问题

### "Docker 和虚拟机有什么区别？"

> 虚拟机模拟完整的硬件和操作系统，每个 VM 有自己的内核，隔离强但笨重（GB 级内存、分钟级启动）。容器共享宿主机内核，用内核的 Namespace 做隔离、Cgroups 做限制，轻量很多（MB 级内存、秒级启动），但隔离性弱于 VM。简单说：VM 是每人一套房，容器是合租公寓——公寓更省空间，但隔音差一点。

### "Docker 的网络模式有哪些？"

> 最常用的四种：bridge（默认，容器有独立网络，通过虚拟网桥互相通信）、host（容器直接用宿主机网络，没隔离但性能好）、none（没网络）、container（和指定容器共享网络）。日常用 bridge + 自定义网络 + 服务名 DNS 就够了。

### "EXPOSE 和 -p 有什么区别？"

> `EXPOSE` 只是文档说明，"这个应用打算用 8000 端口"，不做任何实际映射。`-p 8080:8000` 才真正把宿主机端口映射到容器端口。写 `EXPOSE` 是个好习惯，但写不写不影响功能。

### "CMD 和 ENTRYPOINT 有什么区别？"

> `CMD` 是默认命令，可以被 `docker run` 后面的参数覆盖。`ENTRYPOINT` 是固定入口，后面的参数会追加。最佳实践是 ENTRYPOINT 定义主命令，CMD 提供默认参数。

### "为什么镜像要分层？"

> 层可以复用和缓存。10 个应用都用 `python:3.11-slim`，这层只下载和存储一次。构建时只要某层以上的指令没变，就直接用缓存，改个代码不用重新装依赖。

---

## 相关链接

- Docker 官方文档：https://docs.docker.com/
- Dockerfile 最佳实践：https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- Docker Hub（公共镜像仓库）：https://hub.docker.com/
- Docker 安全实践：https://docs.docker.com/engine/security/
